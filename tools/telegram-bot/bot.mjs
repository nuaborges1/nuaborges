import { pathToFileURL } from 'node:url';

const username = 'NuaBorgesBot';
const commands = [
  { command: 'start', description: 'Abrir a conversa com a Nua Borges' },
  { command: 'ajuda', description: 'Ver os comandos disponíveis' },
  { command: 'status', description: 'Verificar se o bot está respondendo' },
];

export function replyFor(message) {
  if (message?.chat?.type !== 'private' || message.from?.is_bot) return null;
  const command = message.text?.trim().split(/\s+/)[0]?.toLowerCase() || '';
  const [name, recipient] = command.split('@');
  if (recipient && recipient !== username.toLowerCase()) return null;
  if (name === '/start') return 'Olá! Este é o bot oficial da Nua Borges. Use /status para testar a conexão ou /ajuda para ver os comandos.';
  if (name === '/status') return 'Tudo certo! Recebi seu comando e estou respondendo por aqui.';
  if (name === '/ajuda' || name === '/help') return '/start — Iniciar a conversa\n/status — Testar a conexão\n/ajuda — Ver esta lista';
  return 'Para falar com o bot, escolha um comando no menu ou envie /ajuda.';
}

class BotError extends Error {
  constructor(method, code, retryAfter) {
    super(method + ' retornou ' + code);
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

function apiClient(token) {
  return async (method, body = {}) => {
    const response = await fetch('https://api.telegram.org/bot' + token + '/' + method, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
      redirect: 'error',
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new BotError(method, data.error_code || response.status, data.parameters?.retry_after);
    }
    return data.result;
  };
}

export async function initialize(api) {
  const me = await api('getMe');
  if (!me.is_bot || me.username?.toLowerCase() !== username.toLowerCase()) {
    throw new BotError('A credencial pertence a outro bot', 401);
  }
  const webhook = await api('getWebhookInfo');
  if (webhook.url) throw new BotError('Já existe um webhook ativo para este bot', 409);
  await api('setMyCommands', { commands, scope: { type: 'all_private_chats' } });
}

export async function poll(api, offset) {
  const updates = await api('getUpdates', { offset, timeout: 25, allowed_updates: ['message'], limit: 1 });
  if (!updates.length) return offset;
  const update = updates[0];
  const reply = replyFor(update.message);
  if (reply) {
    try {
      await api('sendMessage', { chat_id: update.message.chat.id, text: reply });
    } catch (error) {
      // A conversa pode ter sido bloqueada depois que a mensagem entrou na fila.
      if (error.code !== 403) throw error;
    }
  }
  return update.update_id + 1;
}

async function run() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error('Credencial do bot ausente.');
  const api = apiClient(token);
  let ready = false;
  let offset = 0;
  let delaySeconds = 2;
  for (;;) {
    try {
      if (!ready) {
        await initialize(api);
        ready = true;
        console.log('@NuaBorgesBot conectado. Aguardando mensagens privadas.');
      }
      offset = await poll(api, offset);
      delaySeconds = 2;
    } catch (error) {
      if ([401, 404, 409].includes(error.code)) throw error;
      const wait = Math.max(delaySeconds, Number(error.retryAfter) || 0);
      console.error('Conexão pendente. Nova tentativa em ' + wait + ' segundos.');
      await new Promise(resolve => setTimeout(resolve, wait * 1000));
      delaySeconds = Math.min(delaySeconds * 2, 60);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(error => {
    console.error(error instanceof BotError ? error.message : 'Não foi possível iniciar o bot. Confira a credencial e a conexão.');
    process.exitCode = 1;
  });
}
