/**
 * NUA BORGES — Permanent QA Deploy Gate Runner (Hardened v2)
 *
 * Profiles:
 *   - smoke:      Fast pre-deploy gate (typecheck + unit + security + api + integration + DEF-001..006 regression + audit regressions)
 *   - regression: Full regression (legacy suite + all Vitest layers + Playwright E2E)
 *   - prelaunch:  Certification gate (typecheck + lint + build + coverage + regression + E2E -> GO / NO-GO / INDETERMINADO)
 *
 * Hardening guarantees:
 *   - Includes P0–P2 defect regressions (`tests/regression`) inside `smoke` so critical regressions ALWAYS block deploy.
 *   - Fails if ANY Vitest or Playwright step executes 0 tests (prevents silent empty-glob false positives).
 *   - Writes per-run, non-overwriting evidence files under `tests/reports/runs/<runId>/` alongside `gate-<profile>.json`.
 *   - Strictly isolated: never writes to production databases, never triggers real payments or external emails.
 *   - Exits with non-zero status code on ANY failure or NO-GO verdict.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const profile = (process.argv[2] || 'smoke').toLowerCase();
const rootDir = process.cwd();
const reportsDir = path.join(rootDir, 'tests', 'reports');
const runsDir = path.join(reportsDir, 'runs');
fs.mkdirSync(runsDir, { recursive: true });

// Safety guard: refuse execution if explicitly pointed at production live mutation
if (process.env.RUN_DESTRUCTIVE_PERSISTENCE_TESTS === 'true') {
  console.error('[QA Gate] BLOCKED: RUN_DESTRUCTIVE_PERSISTENCE_TESTS=true is forbidden in automated gate runs.');
  process.exit(2);
}

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';
const npxCmd = isWin ? 'npx.cmd' : 'npx';

function safeGit(args) {
  const r = spawnSync('git', args, { cwd: rootDir, encoding: 'utf8', shell: isWin });
  return r.status === 0 ? String(r.stdout || '').trim() : 'unknown';
}

const commitHash = safeGit(['rev-parse', '--short', 'HEAD']);
const branchName = safeGit(['rev-parse', '--abbrev-ref', 'HEAD']);
const now = new Date();
const runStamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
const runId = `${runStamp}-${profile}`;
const runDir = path.join(runsDir, runId);
fs.mkdirSync(runDir, { recursive: true });

function parseVitestJson(jsonPath) {
  if (!fs.existsSync(jsonPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return {
      totalTests: Number(raw.numTotalTests || 0),
      passedTests: Number(raw.numPassedTests || 0),
      failedTests: Number(raw.numFailedTests || 0),
      skippedTests: Number(raw.numPendingTests || 0) + Number(raw.numTodoTests || 0),
      totalSuites: Number(raw.numTotalTestSuites || 0),
    };
  } catch {
    return null;
  }
}

function parsePlaywrightJson(jsonPath) {
  if (!fs.existsSync(jsonPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const stats = raw.stats || {};
    const expected = Number(stats.expected || 0);
    const unexpected = Number(stats.unexpected || 0);
    const flaky = Number(stats.flaky || 0);
    const skipped = Number(stats.skipped || 0);
    return {
      totalTests: expected + unexpected + flaky + skipped,
      passedTests: expected + flaky,
      failedTests: unexpected,
      skippedTests: skipped,
    };
  } catch {
    return null;
  }
}

function runStep(step) {
  const { name, slug, cmd, args, kind } = step;
  const finalArgs = [...args];
  let evidencePath = null;

  if (kind === 'vitest') {
    evidencePath = path.join(runDir, `${slug}.json`);
    finalArgs.push('--reporter=default', '--reporter=json', `--outputFile=${evidencePath}`);
  } else if (kind === 'playwright') {
    evidencePath = path.join(runDir, `${slug}.json`);
  }

  console.log(`\n▶ [QA Gate:${profile}] Running: ${name}`);
  const startedAt = Date.now();
  const res = spawnSync(cmd, finalArgs, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: isWin,
    env: {
      ...process.env,
      QA_ISOLATED_MODE: 'true',
      CI: process.env.CI || 'true',
    },
  });
  const durationMs = Date.now() - startedAt;

  let metrics = null;
  let zeroTestViolation = false;

  if (kind === 'vitest' && evidencePath) {
    metrics = parseVitestJson(evidencePath);
    if (fs.existsSync(evidencePath)) {
      fs.copyFileSync(evidencePath, path.join(reportsDir, 'vitest-results.json'));
    }
    if (!metrics || metrics.totalTests === 0) {
      zeroTestViolation = true;
    }
  } else if (kind === 'playwright') {
    const pwDefaultPath = path.join(reportsDir, 'playwright-results.json');
    if (fs.existsSync(pwDefaultPath) && evidencePath) {
      fs.copyFileSync(pwDefaultPath, evidencePath);
    }
    metrics = parsePlaywrightJson(evidencePath || pwDefaultPath);
    if (!metrics || metrics.totalTests === 0) {
      zeroTestViolation = true;
    }
  }

  const exitCode = zeroTestViolation ? 1 : (res.status ?? 1);
  const passed = exitCode === 0;
  if (zeroTestViolation) {
    console.error(`❌ [QA Gate:${profile}] ZERO TESTS EXECUTED in "${name}" — failing gate to prevent false positive.`);
  }
  console.log(`${passed ? '✅' : '❌'} [QA Gate:${profile}] ${name} (${durationMs}ms) -> exit ${exitCode}`);

  return {
    name,
    slug,
    kind: kind || 'command',
    command: `${cmd} ${finalArgs.join(' ')}`,
    exitCode,
    passed,
    zeroTestViolation,
    durationMs,
    metrics,
    evidenceFile: evidencePath ? path.relative(rootDir, evidencePath).replace(/\\/g, '/') : null,
  };
}

const STEPS_BY_PROFILE = {
  smoke: [
    { name: 'Typecheck (Next + Functions)', slug: 'typecheck', cmd: npmCmd, args: ['run', 'typecheck'], kind: 'command' },
    {
      name: 'Vitest Smoke (Unit + Security + API + Integration + Defect Regressions)',
      slug: 'vitest-smoke',
      cmd: npxCmd,
      args: ['vitest', 'run', 'tests/unit', 'tests/security', 'tests/api', 'tests/integration', 'tests/regression'],
      kind: 'vitest',
    },
    { name: 'Audit Regressions (P0)', slug: 'audit-regressions', cmd: npxCmd, args: ['tsx', 'tests/auditRegressions.test.mjs'], kind: 'command' },
  ],
  regression: [
    { name: 'Legacy Baseline Test Suite', slug: 'legacy-tests', cmd: npmCmd, args: ['test'], kind: 'command' },
    { name: 'Vitest Full Suite (All Layers + Defect Regressions)', slug: 'vitest-full', cmd: npxCmd, args: ['vitest', 'run'], kind: 'vitest' },
    { name: 'Playwright E2E Critical Journeys', slug: 'playwright-e2e', cmd: npxCmd, args: ['playwright', 'test'], kind: 'playwright' },
  ],
  prelaunch: [
    { name: 'Typecheck (Next + Functions)', slug: 'typecheck', cmd: npmCmd, args: ['run', 'typecheck'], kind: 'command' },
    { name: 'ESLint Static Check', slug: 'lint', cmd: npmCmd, args: ['run', 'lint'], kind: 'command' },
    { name: 'Production Static Build', slug: 'build', cmd: npmCmd, args: ['run', 'build'], kind: 'command' },
    { name: 'Legacy Baseline Test Suite', slug: 'legacy-tests', cmd: npmCmd, args: ['test'], kind: 'command' },
    { name: 'Vitest Full Suite + V8 Coverage', slug: 'vitest-coverage', cmd: npxCmd, args: ['vitest', 'run', '--coverage'], kind: 'vitest' },
    { name: 'Playwright E2E Critical Journeys', slug: 'playwright-e2e', cmd: npxCmd, args: ['playwright', 'test'], kind: 'playwright' },
  ],
};

const plan = STEPS_BY_PROFILE[profile];
if (!plan) {
  console.error(`Unknown profile "${profile}". Use: smoke | regression | prelaunch`);
  process.exit(2);
}

const results = [];
for (const step of plan) {
  results.push(runStep(step));
}

const allPassed = results.every((r) => r.passed);
const externalIntegrations = {
  mercadopago_sandbox: process.env.QA_SANDBOX_MP_VERIFIED === 'true' ? 'SANDBOX' : 'BLOQUEADO',
  supabase_staging: process.env.QA_STAGING_SUPABASE_VERIFIED === 'true' ? 'SANDBOX' : 'BLOQUEADO',
  backblaze_b2_staging: process.env.QA_STAGING_B2_VERIFIED === 'true' ? 'SANDBOX' : 'BLOQUEADO',
  smtp_test_account: process.env.QA_STAGING_SMTP_VERIFIED === 'true' ? 'SANDBOX' : 'BLOQUEADO',
};
const anyExternalBlocked = Object.values(externalIntegrations).some((v) => v !== 'SANDBOX');

const verdict =
  profile === 'prelaunch'
    ? !allPassed
      ? 'NO-GO'
      : anyExternalBlocked
        ? 'INDETERMINADO (Suite local/contrato/E2E 100% aprovada; validar sandboxes externos: MP TEST-, Supabase Staging, B2 Staging, SMTP Test)'
        : 'GO'
    : allPassed
      ? 'PASS'
      : 'FAIL';

const report = {
  runId,
  profile,
  commit: commitHash,
  branch: branchName,
  timestamp: now.toISOString(),
  verdict,
  allPassed,
  externalIntegrations,
  runDirectory: path.relative(rootDir, runDir).replace(/\\/g, '/'),
  steps: results,
};

const runSummaryPath = path.join(runDir, 'summary.json');
const latestGatePath = path.join(reportsDir, `gate-${profile}.json`);
fs.writeFileSync(runSummaryPath, JSON.stringify(report, null, 2), 'utf8');
fs.writeFileSync(latestGatePath, JSON.stringify(report, null, 2), 'utf8');

console.log(`\n========================================`);
console.log(`QA GATE [${profile.toUpperCase()}] VERDICT: ${verdict}`);
console.log(`Commit: ${commitHash} (${branchName})`);
console.log(`Run summary: ${runSummaryPath}`);
console.log(`Latest gate: ${latestGatePath}`);
console.log(`========================================`);

process.exit(allPassed ? 0 : 1);
