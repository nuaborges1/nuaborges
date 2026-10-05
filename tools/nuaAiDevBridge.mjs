/**
 * tools/nuaAiDevBridge.mjs — Servidor autônomo local da Nua IA
 */

import { startNuaAiLocalDevServer } from '../lib/nuaAi/devServer.ts';

startNuaAiLocalDevServer(3105)
  .then(() => {
    console.log('[NuaAiBridge] Servidor ativo e pronto na porta 3105.');
  })
  .catch((err) => {
    console.error('[NuaAiBridge] Falha ao iniciar:', err);
  });
