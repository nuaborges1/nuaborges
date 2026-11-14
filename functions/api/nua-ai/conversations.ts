import { createAssistantServices } from '../../../lib/nuaAi/assistantServices.mjs';
export const onRequestGet = async ({ env }: { env: Record<string, string> }) => {
  try {
    return Response.json({ conversations: await createAssistantServices(env).listConversations() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    // O histórico é auxiliar: uma indisponibilidade do armazenamento não pode quebrar o chat.
    return Response.json({ conversations: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
};
