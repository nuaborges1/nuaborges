-- =============================================================================
-- CONSOLIDATED_PRODUCTION_SETUP.sql
-- Script único e 100% idempotente para aplicar no SQL Editor do Supabase.
-- Consolida as migrações:
--   1. 202611170001_appointments_atomic_reservation.sql
--   2. 202611180001_nua_id_schema.sql
--   3. 202611180002_appointments_exclusion_constraint.sql
--   4. 202611190001_appointments_multi_slot_and_reminders.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PARTE 1: Coluna expires_at e expiração automática de reservas VIP
-- -----------------------------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS appointments_schedule_lookup_idx
  ON public.appointments (date_time)
  WHERE status IN ('aguardando_pagamento', 'confirmada', 'reagendamento_pendente');

CREATE INDEX IF NOT EXISTS appointments_pending_expiry_idx
  ON public.appointments (expires_at)
  WHERE status = 'aguardando_pagamento';

CREATE OR REPLACE FUNCTION public.expire_vip_appointments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('nua:vip-appointment-reservation'));
  UPDATE public.appointments a
  SET status = 'cancelada',
      notes = jsonb_set(
        jsonb_set(
          CASE WHEN a.notes IS NOT NULL AND left(a.notes, 1) = '{' THEN a.notes::jsonb ELSE jsonb_build_object('clientNotes', COALESCE(a.notes, '')) END,
          '{cancellationReason}', to_jsonb('Prazo de pagamento expirou'::text), true
        ),
        '{history}',
        COALESCE((CASE WHEN a.notes IS NOT NULL AND left(a.notes, 1) = '{' THEN a.notes::jsonb ELSE jsonb_build_object('clientNotes', COALESCE(a.notes, '')) END)->'history', '[]'::jsonb)
          || jsonb_build_array(jsonb_build_object(
            'at', now(), 'action', 'reserva_expirada',
            'note', 'O prazo para concluir o pagamento terminou; a vaga foi liberada.',
            'author', 'system'
          )),
        true
      )::text,
      updated_at = now()
  WHERE a.status = 'aguardando_pagamento'
    AND a.expires_at IS NOT NULL
    AND a.expires_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_vip_appointments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_vip_appointments() TO service_role;

CREATE OR REPLACE FUNCTION public.appointment_expiry_from_notes(p_notes text)
RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN NULLIF((p_notes::jsonb ->> 'expiresAt'), '')::timestamptz;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

UPDATE public.appointments
SET expires_at = COALESCE(
  public.appointment_expiry_from_notes(notes),
  created_at + interval '15 minutes'
)
WHERE status = 'aguardando_pagamento'
  AND expires_at IS NULL;

-- -----------------------------------------------------------------------------
-- PARTE 2: NUA ID — Contas, Sessões, Entitlements, Claims e Auditoria
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  email_normalized TEXT UNIQUE NOT NULL,
  display_name TEXT,
  phone_masked TEXT,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  anonymized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email_normalized);
CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles (status);

CREATE TABLE IF NOT EXISTS public.customer_sessions (
  id TEXT PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_label TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS customer_sessions_profile_idx ON public.customer_sessions (profile_id);
CREATE INDEX IF NOT EXISTS customer_sessions_expires_idx ON public.customer_sessions (expires_at) WHERE is_revoked = false;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'legacy';

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.personalizados_orders
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_profile_idx ON public.orders (profile_id);
CREATE INDEX IF NOT EXISTS appointments_profile_idx ON public.appointments (profile_id);
CREATE INDEX IF NOT EXISTS personalizados_profile_idx ON public.personalizados_orders (profile_id);

CREATE TABLE IF NOT EXISTS public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_ref TEXT NOT NULL,
  kind TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_entitlement_order_resource UNIQUE (order_ref, resource_id)
);

CREATE INDEX IF NOT EXISTS entitlements_profile_idx ON public.entitlements (profile_id);
CREATE INDEX IF NOT EXISTS entitlements_resource_idx ON public.entitlements (resource_id);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  provider_payment_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL,
  raw_status TEXT,
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_provider_payment UNIQUE (provider, provider_payment_id)
);

CREATE INDEX IF NOT EXISTS payments_order_ref_idx ON public.payments (order_ref);

CREATE TABLE IF NOT EXISTS public.payment_events (
  provider TEXT NOT NULL,
  event_key TEXT NOT NULL,
  payment_id TEXT,
  payload JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_key)
);

CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  provider_refund_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_claims (
  order_ref TEXT PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  method TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS order_claims_profile_idx ON public.order_claims (profile_id);

CREATE TABLE IF NOT EXISTS public.customer_audit_events (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  actor_ip_hash TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_events (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_events
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS notification_events_dedupe_key_uidx
  ON public.notification_events (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_read_own_profile ON public.profiles;
CREATE POLICY customer_read_own_profile ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS customer_read_own_entitlements ON public.entitlements;
CREATE POLICY customer_read_own_entitlements ON public.entitlements
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS customer_read_own_sessions ON public.customer_sessions;
CREATE POLICY customer_read_own_sessions ON public.customer_sessions
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- -----------------------------------------------------------------------------
-- PARTE 3: RPCs reserve_vip_appointment e reschedule_vip_appointment (Multi-slot)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reserve_vip_appointment(
  p_booking jsonb,
  p_buffer_minutes integer DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start timestamptz;
  v_end timestamptz;
  v_buffer integer := GREATEST(0, LEAST(COALESCE(p_buffer_minutes, 0), 180));
  v_inserted integer;
  v_settings jsonb;
  v_timezone text;
  v_daily_limit_raw text;
  v_daily_limit integer;
  v_schedule_date date;
BEGIN
  IF jsonb_typeof(p_booking) <> 'object'
     OR NULLIF(p_booking ->> 'id', '') IS NULL
     OR NULLIF(p_booking ->> 'date_time', '') IS NULL THEN
    RAISE EXCEPTION 'Invalid appointment payload';
  END IF;

  v_start := (p_booking ->> 'date_time')::timestamptz;
  v_end := v_start + make_interval(mins => GREATEST(1, COALESCE((p_booking ->> 'duration_minutes')::integer, 30)));
  SELECT settings INTO v_settings FROM public.appointments_settings WHERE id = 1;
  v_timezone := COALESCE(NULLIF(v_settings ->> 'timezone', ''), 'Europe/Dublin');
  v_daily_limit_raw := NULLIF(btrim(COALESCE(v_settings ->> 'dailyBookingLimit', '')), '');
  IF v_daily_limit_raw IS NOT NULL AND v_daily_limit_raw ~ '^\d+$' THEN
    v_daily_limit := v_daily_limit_raw::integer;
  ELSE
    v_daily_limit := NULL;
  END IF;
  v_schedule_date := (v_start AT TIME ZONE v_timezone)::date;

  PERFORM pg_advisory_xact_lock(hashtext('nua:vip-appointment-reservation'));

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.status IN ('confirmada', 'aguardando_pagamento', 'reagendamento_pendente')
      AND NOT (a.status = 'aguardando_pagamento' AND a.expires_at IS NOT NULL AND a.expires_at <= now())
      AND a.date_time < v_end + make_interval(mins => v_buffer)
      AND a.date_time + make_interval(mins => GREATEST(1, COALESCE(a.duration_minutes, 30) + v_buffer)) > v_start
  ) THEN
    RETURN false;
  END IF;

  IF v_daily_limit IS NOT NULL AND v_daily_limit > 0 AND (
    SELECT count(*) FROM public.appointments a
    WHERE a.status IN ('confirmada', 'aguardando_pagamento', 'reagendamento_pendente')
      AND NOT (a.status = 'aguardando_pagamento' AND a.expires_at IS NOT NULL AND a.expires_at <= now())
      AND (a.date_time AT TIME ZONE v_timezone)::date = v_schedule_date
  ) >= v_daily_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.appointments (
    id, public_token, client_name, client_contact, client_instagram,
    modality_id, date_time, duration_minutes, total_price, status,
    payment, call_link, notes, created_at, updated_at, expires_at
  ) VALUES (
    p_booking ->> 'id',
    p_booking ->> 'public_token',
    COALESCE(p_booking ->> 'client_name', ''),
    COALESCE(p_booking ->> 'client_contact', ''),
    COALESCE(p_booking ->> 'client_instagram', ''),
    p_booking ->> 'modality_id',
    v_start,
    COALESCE((p_booking ->> 'duration_minutes')::integer, 30),
    COALESCE((p_booking ->> 'total_price')::numeric, 0),
    p_booking ->> 'status',
    p_booking -> 'payment',
    COALESCE(p_booking ->> 'call_link', ''),
    COALESCE(p_booking ->> 'notes', ''),
    COALESCE((p_booking ->> 'created_at')::timestamptz, now()),
    COALESCE((p_booking ->> 'updated_at')::timestamptz, now()),
    COALESCE((p_booking ->> 'expires_at')::timestamptz, now() + interval '15 minutes')
  )
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_vip_appointment(jsonb, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_vip_appointment(jsonb, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.reschedule_vip_appointment(
  p_booking jsonb,
  p_buffer_minutes integer DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id text := p_booking ->> 'id';
  v_start timestamptz := (p_booking ->> 'date_time')::timestamptz;
  v_duration integer := GREATEST(1, COALESCE((p_booking ->> 'duration_minutes')::integer, 30));
  v_buffer integer := GREATEST(0, LEAST(COALESCE(p_buffer_minutes, 0), 180));
  v_updated integer;
  v_settings jsonb;
  v_timezone text;
  v_daily_limit_raw text;
  v_daily_limit integer;
  v_schedule_date date;
BEGIN
  IF NULLIF(v_id, '') IS NULL OR v_start IS NULL THEN
    RAISE EXCEPTION 'Invalid appointment payload';
  END IF;

  SELECT settings INTO v_settings FROM public.appointments_settings WHERE id = 1;
  v_timezone := COALESCE(NULLIF(v_settings ->> 'timezone', ''), 'Europe/Dublin');
  v_daily_limit_raw := NULLIF(btrim(COALESCE(v_settings ->> 'dailyBookingLimit', '')), '');
  IF v_daily_limit_raw IS NOT NULL AND v_daily_limit_raw ~ '^\d+$' THEN
    v_daily_limit := v_daily_limit_raw::integer;
  ELSE
    v_daily_limit := NULL;
  END IF;
  v_schedule_date := (v_start AT TIME ZONE v_timezone)::date;

  PERFORM pg_advisory_xact_lock(hashtext('nua:vip-appointment-reservation'));

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.id <> v_id
      AND a.status IN ('confirmada', 'aguardando_pagamento', 'reagendamento_pendente')
      AND NOT (a.status = 'aguardando_pagamento' AND a.expires_at IS NOT NULL AND a.expires_at <= now())
      AND a.date_time < v_start + make_interval(mins => v_duration + v_buffer)
      AND a.date_time + make_interval(mins => GREATEST(1, COALESCE(a.duration_minutes, 30) + v_buffer)) > v_start
  ) THEN
    RETURN false;
  END IF;

  IF v_daily_limit IS NOT NULL AND v_daily_limit > 0 AND (
    SELECT count(*) FROM public.appointments a
    WHERE a.id <> v_id
      AND a.status IN ('confirmada', 'aguardando_pagamento', 'reagendamento_pendente')
      AND NOT (a.status = 'aguardando_pagamento' AND a.expires_at IS NOT NULL AND a.expires_at <= now())
      AND (a.date_time AT TIME ZONE v_timezone)::date = v_schedule_date
  ) >= v_daily_limit THEN
    RETURN false;
  END IF;

  UPDATE public.appointments
  SET date_time = v_start,
      duration_minutes = v_duration,
      status = p_booking ->> 'status',
      call_link = COALESCE(p_booking ->> 'call_link', ''),
      notes = COALESCE(p_booking ->> 'notes', ''),
      updated_at = COALESCE((p_booking ->> 'updated_at')::timestamptz, now()),
      expires_at = COALESCE((p_booking ->> 'expires_at')::timestamptz, expires_at)
  WHERE id = v_id AND status <> 'cancelada';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.reschedule_vip_appointment(jsonb, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_vip_appointment(jsonb, integer) TO service_role;

-- -----------------------------------------------------------------------------
-- PARTE 4: Constraint GiST anti-sobreposição e limpeza de dailyBookingLimit = 1
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION public.appointment_slot_range(
  p_start timestamptz,
  p_duration_minutes integer
)
RETURNS tstzrange
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT tstzrange(
    p_start,
    p_start + make_interval(mins => GREATEST(1, COALESCE(p_duration_minutes, 30))),
    '[)'
  );
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_no_overlap_active'
      AND conrelid = 'public.appointments'::regclass
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_no_overlap_active
      EXCLUDE USING gist (public.appointment_slot_range(date_time, duration_minutes) WITH &&)
      WHERE (status IN ('confirmada', 'aguardando_pagamento', 'reagendamento_pendente'));
  END IF;
END $$;

UPDATE public.appointments_settings
SET settings = settings - 'dailyBookingLimit'
WHERE id = 1
  AND (settings ->> 'dailyBookingLimit') = '1';
