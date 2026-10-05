/**
 * Cloudflare Pages Function: /api/nua-ai/conversations
 */

interface Env {
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

export const onRequestGet = async ({ env }: PagesContext<Env>) => {
  return json({
    conversations: [
      {
        id: 'conv_rafael_stories',
        title: 'Interação com seguidor Rafael nos Stories',
        summary: 'Lua relatou dúvidas sobre o seguidor Rafael e a IA sugeriu abrir caixinha de perguntas temática.',
        createdAt: '2026-09-28T14:20:10.000Z',
        updatedAt: '2026-09-28T14:21:06.000Z',
        messageCount: 4,
      },
      {
        id: 'conv_reels_mitos',
        title: 'Roteiro: Mitos do Orgasmo Feminino',
        summary: 'Planejamento de Reel educativo sobre mitos do orgasmo feminino com gancho dos 70% nos primeiros 3 segundos.',
        createdAt: '2026-10-01T10:15:00.000Z',
        updatedAt: '2026-10-01T10:16:34.000Z',
        messageCount: 4,
      },
    ],
  });
};
