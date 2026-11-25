import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { createHash, randomUUID } from 'node:crypto';
import { stripVTControlCharacters, parseArgs } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';

const home = path.dirname(fileURLToPath(import.meta.url));
const logs = path.join(home, 'logs');
const receiptPath = path.join(logs, 'build-valido.json');
const configurations = {
  site: { label: 'Site público', project: 'nuaborges', config: 'wrangler.toml', output: 'out-site', url: 'https://nuaborges.com.br' },
  admin: { label: 'Painel da Nua', project: 'nuaborges-admin', config: 'wrangler.admin.toml', output: 'out-admin', url: 'https://admin.nuaborges.com.br' },
  admingeral: { label: 'Central Dev', project: 'admingeral', config: 'wrangler.admingeral.toml', output: 'out-admingeral', url: 'https://admingeral.pages.dev' },
};
const keys = Object.keys(configurations);
const abort = new AbortController();
let config;
let cwd;
let active;
let logFile;
let result;
let step;
let stageStarted;
let lock;
let lockPath;

function emit(event, fields = {}) {
  process.stdout.write(JSON.stringify({ event, ...fields }) + '\n');
}

function readJson(filename, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw new Error('Não foi possível ler ' + path.basename(filename) + ': ' + error.message);
  }
}

function writeJson(filename, data) {
  const temporary = filename + '.' + randomUUID() + '.tmp';
  try {
    fs.writeFileSync(temporary, JSON.stringify(data, null, 2), { flag: 'wx' });
    fs.renameSync(temporary, filename);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

function httpsUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Use uma URL HTTPS sem credenciais: ' + url.hostname);
  }
  return url.href;
}

function publicUrl(key) {
  const target = configurations[key];
  const legacy = config.urls?.[key];
  const configured = config.production_urls?.[key]
    ?? (legacy && !new URL(legacy).hostname.endsWith('.pages.dev') ? legacy : undefined)
    ?? (key === 'admingeral' ? legacy : undefined);
  return httpsUrl(configured || target.url);
}

function sanitize(line) {
  return stripVTControlCharacters(line)
    .replace(/\b(Bearer\s+)[^\s,"]+/gi, '$1[oculto]')
    .replace(/([?&](?:token|access_token|signature|sig|key|code)=)[^&\s]+/gi, '$1[oculto]')
    .replace(/((?:CLOUDFLARE_API_TOKEN|SUPABASE_SERVICE_ROLE_KEY|MP_ACCESS_TOKEN|HOSTINGER_MAIL_API_KEY)\s*[:=]\s*)[^\s,"]+/gi, '$1[oculto]');
}

function record(line, level = 'detail') {
  const text = sanitize(line);
  if (logFile) fs.writeSync(logFile, '[' + new Date().toLocaleTimeString('pt-BR') + '] ' + text + '\n');
  emit('line', { level, text });
}

function levelFor(line) {
  if (/(\[ERROR\]|^npm (?:ERR!|error)|^Error:|^fatal:|^❌)/i.test(line)) return 'error';
  if (/(\[WARNING\]|^\s*warn(?:ing)?[: ]|attention|⚠)/i.test(line)) return 'warn';
  if (/sync|supabase|compil|creating|generating|pacote|uploaded|deployment complete|uploading|all .+ passed|test suite/i.test(line)) return 'progress';
  return 'detail';
}

function acquireLock() {
  lockPath = path.join(cwd, '.git');
  lockPath = fs.statSync(lockPath, { throwIfNoEntry: false })?.isDirectory()
    ? path.join(lockPath, 'nua-deploy-v2.lock')
    : path.join(logs, 'execucao.lock');

  try {
    lock = fs.openSync(lockPath, 'wx');
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const pid = Number(fs.readFileSync(lockPath, 'utf8'));
    let alive = Number.isSafeInteger(pid) && pid > 0;
    if (alive) {
      try { process.kill(pid, 0); } catch (check) { alive = check.code !== 'ESRCH'; }
    }
    // A fresh empty file can belong to another worker that just acquired the lock.
    if (alive || Date.now() - fs.statSync(lockPath).mtimeMs < 3000) {
      throw new Error('Já existe uma execução em andamento neste projeto.');
    }
    // The interface also holds a session mutex, so only its worker can recover a stale lock.
    if (!options.managed) throw new Error('Abra o painel para recuperar a execução anterior.');
    fs.unlinkSync(lockPath);
    lock = fs.openSync(lockPath, 'wx');
  }
  fs.writeFileSync(lock, String(process.pid));
}

function requireFile(filename, message) {
  if (!fs.statSync(filename, { throwIfNoEntry: false })?.isFile()) throw new Error(message);
}

function localWrangler() {
  const file = path.join(cwd, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
  requireFile(file, 'Wrangler local ausente. Instale as dependências do projeto com npm ci.');
  return file;
}

function deploymentCommand(key) {
  const { output, project } = configurations[key];
  const args = [process.execPath, localWrangler(), 'pages', 'deploy', path.join(cwd, output),
    '--project-name', project, '--branch', 'main'];
  const dotenv = path.join(cwd, '.env');
  if (fs.existsSync(dotenv)) args.push('--env-file', dotenv);
  return args;
}

async function deployIsolated(key, onLine) {
  const root = path.join(cwd, '.wrangler');
  fs.mkdirSync(root, { recursive: true });
  const workspace = fs.mkdtempSync(path.join(root, 'nua-deploy-'));
  try {
    const targetConfig = path.join(cwd, configurations[key].config);
    // Pages discovers a config from its working directory and rejects --config.
    const redirect = path.join(workspace, '.wrangler', 'deploy');
    fs.mkdirSync(redirect, { recursive: true });
    fs.writeFileSync(path.join(workspace, 'wrangler.toml'), '# Redirected to the project configuration.\n', { flag: 'wx' });
    writeJson(path.join(redirect, 'config.json'), { configPath: path.relative(redirect, targetConfig) });
    await command(deploymentCommand(key), onLine, workspace);
  } finally {
    if (path.dirname(workspace) === root && path.basename(workspace).startsWith('nua-deploy-')) {
      try { fs.rmSync(workspace, { recursive: true, force: true }); }
      catch (error) { record('Falha ao limpar arquivos temporários do Wrangler: ' + error.message, 'warn'); }
    }
  }
}

function validateProject(mode, selected) {
  const pkg = readJson(path.join(cwd, 'package.json'), null);
  if (!pkg) throw new Error('Projeto não encontrado em ' + cwd + '. Confira project_dir no config.json.');
  const required = [];
  if (mode === 'build' || (mode === 'deploy' && !options.reuse)) required.push('build:packages');
  if (mode === 'tests' || (mode === 'deploy' && options.tests)) required.push('typecheck', 'test');
  for (const script of required) {
    if (!pkg.scripts?.[script]) throw new Error('O package.json não possui o script ' + script + '.');
  }
  if (required.length && !fs.statSync(path.join(cwd, 'node_modules'), { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error('Dependências locais ausentes. Execute npm ci na pasta do projeto.');
  }
  if (mode === 'cloudflare') localWrangler();
  if (mode === 'deploy') {
    localWrangler();
    for (const key of selected) {
      const target = configurations[key];
      const file = path.join(cwd, target.config);
      requireFile(file, 'Configuração ausente: ' + target.config);
      const source = fs.readFileSync(file, 'utf8');
      const project = /^\s*name\s*=\s*["']([^"']+)["']/m.exec(source)?.[1];
      const output = /^\s*pages_build_output_dir\s*=\s*["']([^"']+)["']/m.exec(source)?.[1];
      if (project !== target.project || path.normalize(output || '.') !== target.output) {
        throw new Error(target.config + ' não corresponde ao projeto e pacote esperados.');
      }
      publicUrl(key);
    }
  }
}

function outputStamp(key) {
  const root = path.join(cwd, configurations[key].output);
  for (const name of ['index.html', '_headers', '_redirects', 'robots.txt']) {
    requireFile(path.join(root, name), 'Pacote incompleto em ' + configurations[key].output + ': falta ' + name + '. Gere um novo build.');
  }
  const worker = fs.existsSync(path.join(root, '_worker.js'));
  if (worker !== (key !== 'admingeral')) {
    throw new Error('Worker inesperado ou ausente em ' + configurations[key].output + '. Gere um novo build.');
  }
  const hash = createHash('sha256');
  const files = fs.readdirSync(root, { recursive: true }).sort();
  for (const relative of files) {
    const stat = fs.lstatSync(path.join(root, relative));
    if (stat.isSymbolicLink()) throw new Error('Link simbólico inesperado no pacote: ' + relative);
    if (stat.isFile()) hash.update(JSON.stringify([relative, stat.size, stat.mtimeMs]) + '\n');
  }
  return hash.digest('hex');
}

function confirmReuse(selected) {
  const receipt = readJson(receiptPath, null);
  if (receipt?.cwd !== cwd || !receipt.at) throw new Error('Gere um build nesta versão do painel antes de reutilizar pacotes.');
  for (const key of selected) {
    if (outputStamp(key) !== receipt.packages[key]) {
      throw new Error('O pacote de ' + configurations[key].label + ' mudou após o último build válido. Gere um novo build.');
    }
  }
  return receipt;
}

function requestCancel() {
  if (abort.signal.aborted) return;
  abort.abort();
  if (active?.pid && active.exitCode === null && active.signalCode === null) {
    if (process.platform === 'win32') {
      const kill = spawn(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe'),
        ['/PID', String(active.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      kill.on('error', () => active?.kill());
    } else {
      try { process.kill(-active.pid, 'SIGTERM'); } catch { active?.kill(); }
    }
  }
}

async function command(args, onLine = () => {}, directory = cwd) {
  abort.signal.throwIfAborted();
  record('> ' + args.map((value) => /\s/.test(value) ? JSON.stringify(value) : value).join(' '), 'info');
  const child = spawn(args[0], args.slice(1), {
    cwd: directory,
    env: { ...process.env, CI: 'true', FORCE_COLOR: '0', WRANGLER_SEND_METRICS: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    detached: process.platform !== 'win32',
  });
  active = child;
  for (const stream of [child.stdout, child.stderr]) {
    createInterface({ input: stream, crlfDelay: Infinity }).on('line', (raw) => {
      const line = sanitize(raw);
      if (!line.trim()) return;
      onLine(line);
      record(line, levelFor(line));
    });
  }
  let code;
  try {
    code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', resolve);
    });
  } finally {
    active = undefined;
  }
  abort.signal.throwIfAborted();
  if (code !== 0) throw new Error('Comando terminou com código ' + (code ?? 'desconhecido') + '.');
}

function npm(script) {
  const cli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  if (fs.existsSync(cli)) return command([process.execPath, cli, 'run', script]);
  // These script names come from fixed calls below, never from input or settings.
  if (process.platform === 'win32') return command([process.env.ComSpec || 'cmd.exe', '/d', '/c', 'npm', 'run', script]);
  return command(['npm', 'run', script]);
}

async function stage(id, label, work) {
  step = id;
  stageStarted = Date.now();
  emit('stage', { id, label, status: 'running' });
  record(label, 'info');
  const status = await work();
  emit('stage', { id, label, status: status || 'ok', ms: Date.now() - stageStarted });
}

async function build() {
  await stage('build', 'Sincronizar conteúdo e gerar pacotes', async () => {
    fs.rmSync(receiptPath, { force: true });
    await npm('build:packages');
    abort.signal.throwIfAborted();
    const packages = Object.fromEntries(keys.map((key) => [key, outputStamp(key)]));
    writeJson(receiptPath, { cwd, at: new Date().toISOString(), packages });
  });
}

async function test() {
  await stage('types', 'Verificar tipos TypeScript', () => npm('typecheck'));
  await stage('tests', 'Rodar testes automatizados', () => npm('test'));
}

async function probe(url) {
  const trustedHost = new URL(url).hostname;
  let last;
  for (const wait of [0, 1000, 2000]) {
    abort.signal.throwIfAborted();
    if (wait) await delay(wait, undefined, { signal: abort.signal });
    const started = Date.now();
    try {
      const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(6500)]);
      const response = await fetch(url, {
        signal, headers: { 'User-Agent': 'NuaBorges-Deploy/2.0', 'Cache-Control': 'no-cache' },
      });
      response.body?.cancel().catch(() => {});
      const final = new URL(response.url || url);
      const redirected = final.hostname !== trustedHost;
      last = { code: response.status, ms: Date.now() - started, ok: response.ok && !redirected,
        note: redirected ? 'redirecionou para ' + final.hostname : undefined };
      if (response.status < 500 && response.status !== 429) return last;
    } catch (error) {
      abort.signal.throwIfAborted();
      last = { ok: false, note: error.name === 'TimeoutError' ? 'tempo limite' : (error.cause?.code || error.message), ms: Date.now() - started };
    }
  }
  return last;
}

async function verify(key, deploymentUrl) {
  const target = configurations[key];
  const official = publicUrl(key);
  const endpoints = [{ kind: 'Domínio', url: official }];
  if (deploymentUrl && deploymentUrl !== official) endpoints.unshift({ kind: 'Versão publicada', url: deploymentUrl });
  const checks = await Promise.all(endpoints.map(async ({ kind, url }) => {
    const check = await probe(url);
    const label = target.label + ' · ' + kind + ' · ' + (check.code ? 'HTTP ' + check.code : 'sem resposta');
    record(label + ' · ' + check.ms + ' ms' + (check.note ? ' · ' + check.note : '') + ' · ' + url,
      check.ok ? 'ok' : 'warn');
    return { kind, url, ...check };
  }));
  return checks;
}

async function publish(key) {
  const target = configurations[key];
  const entry = result.targets[key];
  await stage('deploy-' + key, 'Publicar ' + target.label + ' em produção', async () => {
    entry.state = 'uploading';
    await deployIsolated(key, (line) => {
      const match = /Deployment complete!.*?(https:\/\/[a-z0-9.-]+\.pages\.dev)(?=[\s/]|$)/i.exec(line);
      if (match) entry.deploymentUrl = httpsUrl(match[1]);
    });
    entry.state = 'published';
    emit('target', { key, ...entry });
  });
  await stage('verify-' + key, 'Checar ' + target.label, async () => {
    entry.checks = await verify(key, entry.deploymentUrl);
    const verified = Boolean(entry.deploymentUrl) && entry.checks.every((check) => check.ok);
    if (!entry.deploymentUrl) record('O Wrangler não exibiu a URL da versão. O domínio foi checado.', 'warn');
    entry.state = verified ? 'verified' : 'warning';
    emit('target', { key, ...entry });
    return verified ? 'ok' : 'warn';
  });
}

async function main() {
  const mode = options.mode;
  if (!['deploy', 'build', 'tests', 'cloudflare', 'http'].includes(mode)) throw new Error('Ação desconhecida.');
  const selected = [...new Set(options.targets.split(','))];
  if (selected.some((key) => !keys.includes(key))) throw new Error('Selecione pelo menos um destino válido.');
  config = readJson(path.join(home, 'config.json'), {});
  cwd = path.resolve(config.project_dir || path.join(os.homedir(), 'Desktop', 'nuaborges', 'nuasite'));
  if (mode !== 'http') validateProject(mode, selected);
  else selected.forEach(publicUrl);

  if (options.plan) {
    record('Projeto: ' + cwd, 'info');
    if (mode === 'deploy') {
      record(options.reuse ? 'Usar os pacotes do último build válido.' : 'Sincronizar conteúdo e executar npm run build:packages.', 'info');
      if (options.tests) record('Executar npm run typecheck e npm run test antes do build ou upload.', 'info');
      if (options.reuse) record('Build gerado em ' + new Date(confirmReuse(selected).at).toLocaleString('pt-BR') + '.', 'info');
      selected.forEach((key) => record(configurations[key].label + ' · ' + publicUrl(key) + ' · '
        + configurations[key].config + ' · ' + deploymentCommand(key).slice(2).join(' '), 'info'));
    }
    emit('done', { status: 'ok', mode: 'plan', ms: 0 });
    return;
  }

  fs.mkdirSync(logs, { recursive: true });
  if (mode === 'deploy' || mode === 'build' || mode === 'tests') acquireLock();
  const now = new Date();
  const runId = now.toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 6);
  const base = path.join(logs, 'deploy-v2_' + runId);
  const ownLog = base + '.log';
  result = {
    at: now.toISOString(), mode, selected, reuse: options.reuse, tests: options.tests, logPath: ownLog,
    targets: Object.fromEntries(selected.map((key) => [key, { state: 'waiting', url: publicUrl(key) }])),
  };
  logFile = fs.openSync(ownLog, 'wx');
  emit('begin', result);
  record('Projeto: ' + cwd, 'info');
  let status = 'ok';
  let errorMessage;
  try {
    if (mode === 'deploy') {
      const receipt = options.reuse ? confirmReuse(selected) : null;
      if (receipt) record('Reutilizando pacotes gerados em ' + new Date(receipt.at).toLocaleString('pt-BR') + '.', 'warn');
      if (options.tests) await test();
      if (!options.reuse) await build();
      if (options.reuse && options.tests) confirmReuse(selected);
      for (const key of selected) {
        abort.signal.throwIfAborted();
        await publish(key);
      }
      if (Object.values(result.targets).some((entry) => entry.state === 'warning')) status = 'warning';
    } else if (mode === 'build') await build();
    else if (mode === 'tests') await test();
    else if (mode === 'cloudflare') await stage('cloudflare', 'Verificar conta Cloudflare', () => command([process.execPath, localWrangler(), 'whoami']));
    else await stage('http', 'Checar domínios selecionados', async () => {
      const checks = await Promise.all(selected.map((key) => verify(key)));
      if (checks.flat().some((check) => !check.ok)) {
        status = 'warning';
        return 'warn';
      }
    });
  } catch (error) {
    const cancelled = abort.signal.aborted;
    status = cancelled ? 'cancelled' : 'failed';
    const uploading = Object.entries(result.targets).find(([, entry]) => entry.state === 'uploading');
    if (uploading) {
      const [key, entry] = uploading;
      entry.state = entry.deploymentUrl ? 'published' : 'unconfirmed';
      emit('target', { key, ...entry });
    }
    errorMessage = cancelled ? 'Execução interrompida.' : sanitize(error.message);
    record(errorMessage, cancelled ? 'warn' : 'error');
    if (uploading && !uploading[1].deploymentUrl) {
      record('Upload sem confirmação. Confira o histórico do projeto na Cloudflare antes de tentar de novo.', 'warn');
    }
    if (step) emit('stage', { id: step, status, ms: Date.now() - stageStarted });
  }
  Object.assign(result, { status, error: errorMessage, ms: Date.now() - now.getTime() });
  record('Resultado: ' + { ok: 'concluído', warning: 'atenção na checagem HTTP', failed: 'falhou', cancelled: 'cancelado' }[status],
    status === 'ok' ? 'ok' : 'warn');
  try {
    writeJson(base + '.json', result);
  } catch (error) {
    record('Falha ao salvar o resumo: ' + error.message, 'warn');
  }
  emit('done', result);
  process.exitCode = { ok: 0, warning: 2, failed: 1, cancelled: 130 }[status];
}

const { values: options } = parseArgs({
  options: {
    mode: { type: 'string', default: 'deploy' },
    targets: { type: 'string', default: keys.join(',') },
    reuse: { type: 'boolean' },
    tests: { type: 'boolean' },
    plan: { type: 'boolean' },
    managed: { type: 'boolean' },
  },
});
let controls;
if (options.managed) {
  controls = createInterface({ input: process.stdin });
  controls.on('line', (data) => { if (data === 'cancel') requestCancel(); });
  controls.on('close', requestCancel);
}
process.once('SIGINT', requestCancel);
process.once('SIGTERM', requestCancel);

try {
  await main();
} catch (error) {
  const message = sanitize(error.message);
  record(message, 'error');
  emit('done', { ...result, status: 'failed', error: message, mode: options.plan ? 'plan' : options.mode });
  process.exitCode = 1;
} finally {
  controls?.removeListener('close', requestCancel);
  controls?.close();
  process.stdin.pause();
  if (logFile) fs.closeSync(logFile);
  if (lock !== undefined) {
    fs.closeSync(lock);
    fs.rmSync(lockPath, { force: true });
  }
}