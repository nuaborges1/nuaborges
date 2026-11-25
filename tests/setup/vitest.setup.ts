import { afterEach } from 'vitest';

// Environment Safety Guard (Protocol Section 2.4):
// Never allow isolated Vitest runs to inherit real production credentials from host env.
const FORBIDDEN_PROD_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'MP_ACCESS_TOKEN',
  'MP_WEBHOOK_SECRET',
  'B2_APPLICATION_KEY_ID',
  'B2_APPLICATION_KEY',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'SMTP_PASS',
  'SMTP_USER',
  'HOSTINGER_API_TOKEN',
  'HOSTINGER_MAIL_API_KEY',
  'GEMINI_API_KEY',
];

for (const key of FORBIDDEN_PROD_VARS) {
  if (process.env[key]) {
    delete process.env[key];
  }
}

process.env.QA_ISOLATED_MODE = 'true';

// Load DOM matchers & React Testing Library cleanup only in jsdom environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
  const { cleanup } = await import('@testing-library/react');
  afterEach(() => {
    cleanup();
  });
}
