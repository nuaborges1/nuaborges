import { createAssistantServices } from '../../../../lib/nuaAi/assistantServices.mjs';

interface PagesContext {
  params: { id?: string };
  env: Record<string, string>;
}

export const onRequestGet = async ({ params, env }: PagesContext) => {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: 'ID da conversa não fornecido.' }, { status: 400 });
    }

    const services = createAssistantServices(env);
    const historyKey = `nua_ai_conversation:${id}`;
    const record = await services.read(historyKey);

    if (!record) {
      return Response.json({
        id,
        title: 'Nova conversa',
        turns: [],
        summary: '',
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return Response.json({
      id: record.id || id,
      title: record.title || 'Conversa sem título',
      turns: record.turns || [],
      summary: record.summary || '',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'Erro ao recuperar histórico da conversa.'
    }, { status: 500 });
  }
};

export const onRequestDelete = async ({ params, env }: PagesContext) => {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: 'ID da conversa não fornecido.' }, { status: 400 });
    }

    const services = createAssistantServices(env);
    const historyKey = `nua_ai_conversation:${id}`;
    if (services.delete) {
      await services.delete(historyKey);
    }
    return Response.json({ success: true, id });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'Erro ao excluir conversa.'
    }, { status: 500 });
  }
};
