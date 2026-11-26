-- Migration: Google Meet Integration (OAuth Tokens, Workspace Events Subscriptions, Idempotency Log & Appointments Metadata)
-- Preserva 100% dos dados existentes.

-- 1. Tabela de tokens OAuth criptografados (AES-256-GCM)
CREATE TABLE IF NOT EXISTS public.google_oauth_tokens (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  email TEXT NOT NULL,
  encrypted_refresh_token TEXT NOT NULL,
  encrypted_access_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  key_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'connected', -- 'connected' | 'revoked' | 'expired' | 'error'
  last_error TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.google_oauth_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.google_oauth_tokens FROM anon, authenticated;

-- 2. Tabela de assinaturas Google Workspace Events
CREATE TABLE IF NOT EXISTS public.google_meet_subscriptions (
  subscription_name TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  space_name TEXT NOT NULL,
  target_resource TEXT NOT NULL,
  event_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  state TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'SUSPENDED' | 'DELETED' | 'EXPIRED'
  expire_time TIMESTAMPTZ NOT NULL,
  last_renewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_meet_subs_booking ON public.google_meet_subscriptions(booking_id);
CREATE INDEX IF NOT EXISTS idx_google_meet_subs_expire ON public.google_meet_subscriptions(expire_time) WHERE state = 'ACTIVE';

ALTER TABLE public.google_meet_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.google_meet_subscriptions FROM anon, authenticated;

-- 3. Log de idempotência para eventos Pub/Sub recebidos
CREATE TABLE IF NOT EXISTS public.google_meet_events_log (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  space_name TEXT,
  conference_record_name TEXT,
  booking_id TEXT,
  event_time TIMESTAMPTZ,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_meet_events_booking ON public.google_meet_events_log(booking_id);

ALTER TABLE public.google_meet_events_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.google_meet_events_log FROM anon, authenticated;

-- 4. Metadados oficiais do Google Meet na tabela appointments (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'appointments'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS google_meet_space_name TEXT;
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS google_meet_code TEXT;
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS conference_record_name TEXT;
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS actual_started_at TIMESTAMPTZ;
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS actual_ended_at TIMESTAMPTZ;
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS actual_duration_seconds INTEGER;
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS effective_duration_seconds INTEGER;
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS attendance_status TEXT;
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS meet_sync_status TEXT;
  END IF;
END $$;
