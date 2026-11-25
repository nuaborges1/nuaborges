-- =============================================================================
-- Migration: 202611250001_prelaunch_security_hardening.sql
--
-- Endurecimento pré-lançamento NUA Borges (100% idempotente):
-- 1. Cria tabela `admin_sessions` para sessões administrativas revogáveis (NUA-AUD-003).
-- 2. Cria tabela `audit_logs` para auditoria durável fora da RAM de isolates (NUA-AUD-005).
-- 3. Cria tabela `rate_limit_counters` + RPC atômica `increment_rate_limit_atomic` (NUA-AUD-007).
-- 4. Renomeia coluna legada `orders.stripe_payment_intent_id` -> `provider_payment_id` (remoção Stripe).
-- 5. Estende `ENABLE/FORCE ROW LEVEL SECURITY` + `REVOKE ALL FROM anon, authenticated`
--    a TODAS as tabelas de backend, incluindo `b2_media_*`, `admin_sessions`,
--    `audit_logs` e `rate_limit_counters` (NUA-AUD-004).
-- =============================================================================

-- 1. Sessões administrativas revogáveis no servidor (substitui token stateless em localStorage)
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  jti TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  subject TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT
);

CREATE INDEX IF NOT EXISTS admin_sessions_expires_idx
  ON public.admin_sessions (expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS admin_sessions_role_idx
  ON public.admin_sessions (role, created_at DESC);

-- 2. Trilha durável de auditoria administrativa e eventos de segurança
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  actor_role TEXT,
  actor_ip_hash TEXT,
  actor_country TEXT,
  actor_city TEXT,
  actor_ua TEXT,
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_idx
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_type_created_idx
  ON public.audit_logs (event_type, created_at DESC);

-- 3. Rate limiting atômico por janela fixa/deslizante (elimina race condition read-modify-write)
CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  bucket_key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_seconds INTEGER NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_counters_updated_idx
  ON public.rate_limit_counters (updated_at);

CREATE OR REPLACE FUNCTION public.increment_rate_limit_atomic(
  p_bucket_key TEXT,
  p_window_seconds INTEGER,
  p_max_requests INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_win INTEGER := GREATEST(1, LEAST(COALESCE(p_window_seconds, 60), 86400));
  v_max INTEGER := GREATEST(1, LEAST(COALESCE(p_max_requests, 60), 100000));
  v_row public.rate_limit_counters%ROWTYPE;
  v_retry INTEGER := 0;
BEGIN
  IF NULLIF(btrim(COALESCE(p_bucket_key, '')), '') IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', v_max,
      'retry_after_seconds', 0
    );
  END IF;

  INSERT INTO public.rate_limit_counters (bucket_key, window_start, window_seconds, hit_count, updated_at)
  VALUES (p_bucket_key, v_now, v_win, 1, v_now)
  ON CONFLICT (bucket_key) DO UPDATE
  SET
    window_start = CASE
      WHEN rate_limit_counters.window_start + make_interval(secs => rate_limit_counters.window_seconds) <= v_now
        THEN v_now
      ELSE rate_limit_counters.window_start
    END,
    window_seconds = v_win,
    hit_count = CASE
      WHEN rate_limit_counters.window_start + make_interval(secs => rate_limit_counters.window_seconds) <= v_now
        THEN 1
      ELSE rate_limit_counters.hit_count + 1
    END,
    updated_at = v_now
  RETURNING * INTO v_row;

  IF v_row.hit_count > v_max THEN
    v_retry := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM ((v_row.window_start + make_interval(secs => v_row.window_seconds)) - v_now)))::INTEGER
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'count', v_row.hit_count,
      'retry_after_seconds', v_retry
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', GREATEST(0, v_max - v_row.hit_count),
    'count', v_row.hit_count,
    'retry_after_seconds', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.increment_rate_limit_atomic(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit_atomic(TEXT, INTEGER, INTEGER) TO service_role;

-- 4. Remoção da nomenclatura legada da Stripe na tabela `orders`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'stripe_payment_intent_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'orders'
        AND column_name = 'provider_payment_id'
    ) THEN
      ALTER TABLE public.orders
        RENAME COLUMN stripe_payment_intent_id TO provider_payment_id;
    ELSE
      UPDATE public.orders
      SET provider_payment_id = COALESCE(provider_payment_id, stripe_payment_intent_id)
      WHERE provider_payment_id IS NULL AND stripe_payment_intent_id IS NOT NULL;
      ALTER TABLE public.orders
        DROP COLUMN stripe_payment_intent_id;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'orders'
    ) THEN
      ALTER TABLE public.orders
        ADD COLUMN IF NOT EXISTS provider_payment_id TEXT;
    END IF;
  END IF;
END $$;

-- 5. Lockdown RLS completo (incluindo tabelas B2 e novas tabelas de segurança)
DO $$
DECLARE
  tbl TEXT;
  all_backend_tables TEXT[] := ARRAY[
    'admin_sessions',
    'audit_logs',
    'rate_limit_counters',
    'b2_media_index',
    'b2_media_upload_sessions',
    'b2_media_reconcile_runs',
    'payment_events',
    'refunds',
    'customer_audit_events',
    'notification_events',
    'profiles',
    'customer_sessions',
    'entitlements',
    'payments',
    'order_claims',
    'site_content',
    'content_backups',
    'appointments',
    'appointments_settings',
    'personalizados_orders',
    'personalizados_settings',
    'orders',
    'media_assets'
  ];
BEGIN
  FOREACH tbl IN ARRAY all_backend_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated;', tbl);
    END IF;
  END LOOP;
END $$;
