/**
 * NUA IA — Cliente do Modelo de IA com Gestão Resiliente e Fallback
 * 
 * Realiza chamadas com timeout, orquestração multi-modelo (Flash-Lite / Flash)
 * e fallback gracioso sem expor erros técnicos para a cliente.
 */

import { NUA_AI_CONFIG } from './config';

export interface ModelCallOptions {
  systemPrompt: string;
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  apiKey?: string;
  candidateModels?: string[];
}

export interface ModelCallResult {
  reply: string;
  modelUsed: string;
  source: 'gemini' | 'heuristic';
}

/**
 * Lê a chave da API do Gemini de process.env ou tenta ler do arquivo .dev.vars em ambiente local.
 */
export function resolveGeminiApiKey(): string | undefined {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY.trim();
  }

  // Em Node.js no dev local, tenta ler de .dev.vars se ainda não carregado
  try {
    if (typeof process !== 'undefined' && process.cwd) {
      const fs = require('node:fs');
      const path = require('node:path');
      const devVarsPath = path.resolve(process.cwd(), '.dev.vars');
      if (fs.existsSync(devVarsPath)) {
        const content = fs.readFileSync(devVarsPath, 'utf8');
        const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
  } catch {}

  return undefined;
}

/**
 * Executa a chamada com degradação graciosa multi-modelo.
 */
export async function callNuaAiModel(options: ModelCallOptions): Promise<ModelCallResult> {
  const apiKey = options.apiKey || resolveGeminiApiKey();
  const models = options.candidateModels && options.candidateModels.length > 0
    ? options.candidateModels
    : NUA_AI_CONFIG.CANDIDATE_MODELS;

  if (apiKey) {
    for (const model of models) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), NUA_AI_CONFIG.MODEL_TIMEOUT_MS);

        const body = {
          systemInstruction: {
            parts: [{ text: options.systemPrompt }],
          },
          contents: options.contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          },
        };

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          }
        );

        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0];
          const textPart = candidate?.content?.parts?.find((p: any) => typeof p.text === 'string' && !p.thought);
          if (textPart && textPart.text) {
            return {
              reply: textPart.text.trim(),
              modelUsed: model,
              source: 'gemini',
            };
          }
        }
      } catch (err) {
        console.warn(`[NuaAiModel] Tentativa com modelo ${model} falhou, testando próximo:`, err);
      }
    }
  }

  // Fallback heurístico inteligente caso a API esteja sem internet ou sem cota
  return generateHeuristicFallback(options);
}

/**
 * Fallback heurístico contextual para garantir que a Nua IA nunca fique muda ou quebre.
 */
function generateHeuristicFallback(options: ModelCallOptions): ModelCallResult {
  const lastUserTurn = [...options.contents].reverse().find((c) => c.role === 'user');
  const userText = lastUserTurn?.parts?.[0]?.text?.toLowerCase() || '';

  let reply = 'Estou aqui com você! Como posso te ajudar a planejar ou criar algo para a Nua hoje?';

  if (
    userText.includes('api') ||
    userText.includes('código') ||
    userText.includes('banco') ||
    userText.includes('cloudflare') ||
    userText.includes('deploy') ||
    userText.includes('servidor') ||
    userText.includes('integrar') ||
    userText.includes('webhook')
  ) {
    reply =
      'Entendi o que você quer fazer! 💡 Essa parte envolve a estrutura técnica e configurações do sistema da Nua, então o ideal e mais seguro é tratarmos diretamente com o desenvolvedor responsável.\n\n' +
      'Se você me disser qual serviço ou ferramenta você pretende integrar, posso te ajudar a organizar exatamente essa necessidade para você enviar a ele! 🤝';
  } else if (userText.includes('ideia') || userText.includes('post') || userText.includes('reel')) {
    reply = 'Que tal explorarmos um Reel com estética bem intimista e gancho direto nos primeiros 3 segundos? ✨ Um tema que sempre funciona para a Nua é desmistificar uma dúvida comum com delicadeza e firmeza. Quer que eu estruture o gancho e o desenvolvimento? 📝';
  } else if (userText.includes('roteiro')) {
    reply = 'Para os roteiros da Nua, o melhor caminho é sempre o tom espontâneo e livre de afetação. 🎬 Podemos estruturar em:\n\n1. **Gancho inicial** (3 segundos com pergunta forte);\n2. **Quebra de expectativa** com acolhimento e verdade;\n3. **Conclusão intimista** com convite para interagir nos Stories. 🌸';
  } else if (userText.includes('seguidor') || userText.includes('stories')) {
    reply = 'Quando um seguidor interage de forma recorrente, a melhor estratégia é valorizar a dúvida transformando-a em uma caixinha de perguntas geral nos Stories, preservando a intimidade e gerando engajamento comunitário. 💬';
  } else if (userText.includes('onde') || userText.includes('mudar') || userText.includes('site')) {
    reply = 'Eu conheço todo o site da Nua! 🧭 Você pode alterar as fotos na aba **Galeria**, editar o manifesto na aba **Sobre** ou ajustar os links na aba **Canais**. Me diga o que quer alterar que eu te guio exatamente até o local certo no painel. ✨';
  }

  return {
    reply,
    modelUsed: 'heuristic-consultant-v1',
    source: 'heuristic',
  };
}
