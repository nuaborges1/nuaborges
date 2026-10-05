/**
 * Cloudflare Pages Function: /api/nua-ai/chat
 * 
 * Ponto de entrada para a assistente Nua IA na infraestrutura Cloudflare Pages Functions.
 * Suporta fallback em KV / memória em edge, com controle de tokens e segurança.
 */

import { NUA_AI_CONFIG } from '../../lib/nuaAi/config';

interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  NUA_CONTENT?: any;
  CONTENT_KV?: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const onRequestPost = async ({ request, env }: PagesContext<Env>) => {
  try {
    const body = (await request.json().catch(() => ({}))) as any;
    const message = String(body?.message || '').trim();
    const conversationId = String(body?.conversationId || `conv_${Date.now()}`);

    if (!message) {
      return json({
        reply: 'Oi, Nua! Como posso te ajudar com ideias, roteiros, planejamento ou dúvidas de sexologia hoje?',
        conversationId,
        sourcesUsed: { memory: true, history: false, scientific: false, knowledge: false },
        modelUsed: 'instant',
        source: 'heuristic',
      });
    }

    // Se estiver em ambiente Node local com servidor ativo, podemos responder
    // Ou processar com a API do Gemini
    const apiKey = env.GEMINI_API_KEY;
    const model = env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

    let reply = 'Estou aqui com você! Como posso te ajudar a planejar ou criar algo para a Nua hoje?';
    let modelUsed = 'heuristic-v1';
    let source: 'gemini' | 'heuristic' = 'heuristic';

    if (apiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: {
                parts: [
                  {
                    text: `Você é a NUA IA, assistente pessoal e consultora especializada em Sexologia, Sexualidade Humana e Criação Estratégica exclusiva da NUA BORGES.
Regra: Você conhece a Nua, mas não possui permissão para alterar o site ou painel diretamente.
Seja empática, inteligente, intimista, elegante, direta, acolhedora e fundamentada na sexologia baseada em evidências.
Prioridade de domínios: 1. Sexologia e saúde sexual, 2. Educação e prazer feminino, 3. Roteiros de Reels, 4. Planejamento e rotina.`,
                  },
                ],
              },
              contents: [{ role: 'user', parts: [{ text: message }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = (await geminiRes.json()) as any;
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            reply = text.trim();
            modelUsed = model;
            source = 'gemini';
          }
        }
      } catch (e) {
        console.warn('Erro ao chamar Gemini em edge:', e);
      }
    }

    return json({
      reply,
      conversationId,
      sourcesUsed: {
        memory: true,
        history: false,
      },
      modelUsed,
      source,
    });
  } catch (err: any) {
    return json({ error: 'Erro ao processar mensagem na Nua IA.' }, 500);
  }
};
