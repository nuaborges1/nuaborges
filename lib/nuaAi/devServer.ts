/**
 * NUA IA — Servidor HTTP Local (Node.js) para Desenvolvimento
 * 
 * Atua no localhost (porta 3105) persistindo diretamente em `nua-ai/memory/`
 * e `nua-ai/history/` com suporte a JSONL e busca híbrida.
 */

import http from 'node:http';
import {
  processNuaAiChat,
  listNuaAiConversations,
  getNuaAiMemory,
  getNuaAiKnowledge,
  getNuaAiCandidates,
  getNuaAiTelemetry,
} from './engine';
import { getConversationTurns } from './historyStore';
import { approveCandidate, rejectCandidate } from './candidatesStore';
import { NUA_AI_CONFIG } from './config';

let serverInstance: http.Server | null = null;

export function startNuaAiLocalDevServer(port = NUA_AI_CONFIG.DEV_SERVER_PORT): Promise<http.Server> {
  if (serverInstance) {
    return Promise.resolve(serverInstance);
  }

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      // CORS headers para localhost
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const pathname = url.pathname;

      try {
        // Status do serviço
        if (pathname === '/api/nua-ai/status' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', name: 'Nua IA Local Dev Server', port }));
          return;
        }

        // Listar conversas anteriores
        if (pathname === '/api/nua-ai/conversations' && req.method === 'GET') {
          const list = listNuaAiConversations();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ conversations: list }));
          return;
        }

        // Obter mensagens de uma conversa específica
        if (pathname.startsWith('/api/nua-ai/conversations/') && req.method === 'GET') {
          const id = pathname.replace('/api/nua-ai/conversations/', '');
          const turns = getConversationTurns(id, 50);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ conversationId: id, turns }));
          return;
        }

        // Consultar memória consolidada
        if (pathname === '/api/nua-ai/memory' && req.method === 'GET') {
          const mem = getNuaAiMemory();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(mem));
          return;
        }

        // Consultar base de conhecimento consolidado
        if (pathname === '/api/nua-ai/knowledge' && req.method === 'GET') {
          const kb = getNuaAiKnowledge();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(kb));
          return;
        }

        // Consultar métricas de telemetria e custo
        if (pathname === '/api/nua-ai/telemetry' && req.method === 'GET') {
          const telem = getNuaAiTelemetry();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(telem));
          return;
        }

        // Consultar candidatos a aprendizado controlado
        if (pathname === '/api/nua-ai/candidates' && req.method === 'GET') {
          const candidates = getNuaAiCandidates();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ candidates }));
          return;
        }

        // Aprovar candidato
        if (pathname === '/api/nua-ai/candidates/approve' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const { id } = JSON.parse(body || '{}');
              const result = approveCandidate(id);
              res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // Rejeitar candidato
        if (pathname === '/api/nua-ai/candidates/reject' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const { id } = JSON.parse(body || '{}');
              const result = rejectCandidate(id);
              res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // Chat endpoint
        if (pathname === '/api/nua-ai/chat' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const result = await processNuaAiChat(parsed);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            } catch (err: any) {
              console.error('[NuaAiDevServer] Erro no processamento de chat:', err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Erro interno ao processar conversa.' }));
            }
          });
          return;
        }

        // Rota não encontrada
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint da Nua IA não encontrado.' }));
      } catch (err: any) {
        console.error('[NuaAiDevServer] Erro na requisição:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro inesperado no servidor local da Nua IA.' }));
      }
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[NuaAiDevServer] Porta ${port} já em uso (provavelmente servidor já ativo).`);
        serverInstance = server;
        resolve(server);
      } else {
        console.error('[NuaAiDevServer] Erro ao iniciar servidor:', err);
        reject(err);
      }
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`[NuaAiDevServer] Nua IA pronta em http://127.0.0.1:${port}`);
      serverInstance = server;
      resolve(server);
    });
  });
}
