-- Reserva de horários sob transação no PostgreSQL.
-- Aplicar antes de habilitar novas reservas: o endpoint falha fechado sem este RPC.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS appointments_schedule_lookup_idx
  ON public.appointments (date_time)
  WHERE status IN ('aguardando_pagamento', 'confirmada');

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
  v_timezone := COALESCE(v_settings ->> 'timezone', 'Europe/Dublin');
  v_daily_limit := NULLIF(v_settings ->> 'dailyBookingLimit', '')::integer;
  v_schedule_date := v_start AT TIME ZONE v_timezone;

  -- Lock curto e transacional: evita que duas requisições passem na checagem juntas.
  PERFORM pg_advisory_xact_lock(hashtext('nua:vip-appointment-reservation'));

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.status <> 'cancelada'
      AND NOT (a.status = 'aguardando_pagamento' AND a.expires_at IS NOT NULL AND a.expires_at <= now())
      AND a.date_time < v_end + make_interval(mins => v_buffer)
      AND a.date_time + make_interval(mins => GREATEST(1, COALESCE(a.duration_minutes, 30) + v_buffer)) > v_start
  ) THEN
    RETURN false;
  END IF;

  IF v_daily_limit > 0 AND (
    SELECT count(*) FROM public.appointments a
    WHERE a.status <> 'cancelada'
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
  v_daily_limit integer;
  v_schedule_date date;
BEGIN
  IF NULLIF(v_id, '') IS NULL OR v_start IS NULL THEN
    RAISE EXCEPTION 'Invalid appointment payload';
  END IF;
  SELECT settings INTO v_settings FROM public.appointments_settings WHERE id = 1;
  v_timezone := COALESCE(v_settings ->> 'timezone', 'Europe/Dublin');
  v_daily_limit := NULLIF(v_settings ->> 'dailyBookingLimit', '')::integer;
  v_schedule_date := v_start AT TIME ZONE v_timezone;
  PERFORM pg_advisory_xact_lock(hashtext('nua:vip-appointment-reservation'));

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.id <> v_id
      AND a.status <> 'cancelada'
      AND NOT (a.status = 'aguardando_pagamento' AND a.expires_at IS NOT NULL AND a.expires_at <= now())
      AND a.date_time < v_start + make_interval(mins => v_duration + v_buffer)
      AND a.date_time + make_interval(mins => GREATEST(1, COALESCE(a.duration_minutes, 30) + v_buffer)) > v_start
  ) THEN
    RETURN false;
  END IF;

  IF v_daily_limit > 0 AND (
    SELECT count(*) FROM public.appointments a
    WHERE a.id <> v_id
      AND a.status <> 'cancelada'
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

