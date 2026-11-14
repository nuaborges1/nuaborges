import { GeminiEnv, GeminiContent, CallGeminiResult } from './types';

/**
 * Trunca uma string de forma segura preservando caracteres multibyte.
 */
export function safeTruncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return Array.from(str).slice(0, maxLength).join('');
}

/**
 * Faz parse seguro de JSON garantindo que o resultado seja um objeto (rejeita arrays e primitivos).
 */
export function parseJsonSafely(raw: string): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    const val = JSON.parse(clean);
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      return val as Record<string, unknown>;
    }
    return null;
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const val = JSON.parse(match[0]);
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          return val as Record<string, unknown>;
        }
      } catch {}
    }
    return null;
  }
}

/**
 * Obtém a lista deduplicada de modelos Gemini a serem consultados em sequência.
 */
export function resolveCandidateModels(env: GeminiEnv): string[] {
  const defaults = ['gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-3.5-flash-lite'];
  const fromList = env.GEMINI_MODELS
    ? env.GEMINI_MODELS.split(',').map((m) => m.trim()).filter(Boolean)
    : [];
  const single = env.GEMINI_MODEL ? [env.GEMINI_MODEL.trim()] : [];

  const combined = [...single, ...fromList, ...defaults];
  const unique: string[] = [];
  for (const m of combined) {
    if (!unique.includes(m)) unique.push(m);
  }
  return unique;
}

/**
 * Realiza chamada resiliente multi-modelo à API do Gemini com:
 * - Timeout por tentativa (8s) e orçamento global máximo (15s);
 * - Suporte a systemInstruction e structured output (responseSchema);
 * - Gestão de falhas (401/403 param imediatamente; 429/5xx/timeout/400 testam próximo modelo);
 * - Filtro de parts de pensamento e validação de finishReason/blockReason.
 */
export async function callGeminiApi(
  env: GeminiEnv,
  options: {
    systemPrompt: string;
    contents: GeminiContent[];
    responseSchema: Record<string, unknown>;
    maxOutputTokens: number;
    temperature: number;
    validator?: (parsed: Record<string, unknown>) => boolean;
  }
): Promise<CallGeminiResult> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return { data: null, fallbackReason: 'missing_api_key' };
  }

  const models = resolveCandidateModels(env);
  const totalBudgetMs = 15000;
  const perAttemptTimeoutMs = 8000;
  const deadline = Date.now() + totalBudgetMs;
  let lastFailureReason = 'unknown_failure';

  for (const model of models) {
    const remainingBudget = deadline - Date.now();
    if (remainingBudget <= 500) {
      lastFailureReason = 'timeout_budget_exhausted';
      break;
    }

    const attemptTimeout = Math.min(perAttemptTimeoutMs, remainingBudget);

    // Tenta primeiro com thinkingBudget mínimo seguro; se falhar com 400, repete sem thinkingConfig
    const tryCall = async (withThinking: boolean) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), attemptTimeout);

      try {
        const generationConfig: Record<string, unknown> = {
          responseMimeType: 'application/json',
          responseSchema: options.responseSchema,
          maxOutputTokens: options.maxOutputTokens,
          temperature: options.temperature,
        };

        if (withThinking) {
          generationConfig.thinkingConfig = { thinkingBudget: 0 };
        }

        const bodyPayload = {
          systemInstruction: {
            parts: [{ text: options.systemPrompt }],
          },
          contents: options.contents,
          generationConfig,
        };

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify(bodyPayload),
            signal: controller.signal,
          }
        );

        return { res, status: res.status };
      } finally {
        clearTimeout(timer);
      }
    };

    try {
      let callResult = await tryCall(true);

      // Se retornou 400 com thinkingConfig, repete uma vez sem thinkingConfig para o mesmo modelo
      if (callResult.status === 400) {
        callResult = await tryCall(false);
      }

      const { res, status } = callResult;

      // 401 / 403: Chave inválida ou não autorizada — encerra imediatamente sem tentar outros modelos
      if (status === 401 || status === 403) {
        return { data: null, model, fallbackReason: 'auth' };
      }

      // Outros erros HTTP (400, 404, 429, 500, 503): tenta o próximo modelo
      if (!res.ok) {
        lastFailureReason = `http_${status}`;
        continue;
      }

      const jsonResponse: any = await res.json().catch(() => null);
      if (!jsonResponse) {
        lastFailureReason = 'invalid_http_json';
        continue;
      }

      // Verificação de bloqueio por moderação
      if (jsonResponse.promptFeedback?.blockReason) {
        lastFailureReason = `blocked_${jsonResponse.promptFeedback.blockReason}`;
        continue;
      }

      const candidate = jsonResponse.candidates?.[0];
      if (!candidate) {
        lastFailureReason = 'no_candidates';
        continue;
      }

      // Verificação do motivo de finalização
      if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'MAX_TOKENS') {
        lastFailureReason = `finish_${candidate.finishReason.toLowerCase()}`;
        continue;
      }

      const parts: any[] = candidate.content?.parts || [];
      // Juntar todas as parts de texto que NÃO sejam de pensamento interno
      const textParts = parts
        .filter((p) => p && typeof p.text === 'string' && !p.thought)
        .map((p) => p.text)
        .join('');

      const parsed = parseJsonSafely(textParts);
      if (!parsed) {
        lastFailureReason = 'malformed_json_response';
        continue;
      }

      if (options.validator && !options.validator(parsed)) {
        lastFailureReason = 'schema_validation_failed';
        continue;
      }

      return { data: parsed, model, fallbackReason: undefined };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        lastFailureReason = 'timeout_attempt';
      } else {
        lastFailureReason = err?.message || 'fetch_exception';
      }
      continue;
    }
  }

  return { data: null, fallbackReason: lastFailureReason };
}
