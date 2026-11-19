-- =============================================================================
-- Migration: 202611180002_appointments_exclusion_constraint.sql
-- Defesa em profundidade no banco para Chamadas VIP:
-- Garante em nível PostgreSQL (btree_gist + EXCLUDE USING gist) que duas reservas
-- ativas (confirmadas ou em hold) nunca possam se sobrepor no mesmo intervalo UTC.
--
-- ATENÇÃO (Gate 3): Antes de aplicar em produção, rode a consulta de diagnóstico
-- abaixo para confirmar zero sobreposições históricas:
--   SELECT a.id, b.id, a.date_time, b.date_time
--   FROM public.appointments a
--   JOIN public.appointments b ON a.id < b.id
--   WHERE a.status IN ('confirmada', 'aguardando_pagamento')
--     AND b.status IN ('confirmada', 'aguardando_pagamento')
--     AND tstzrange(a.date_time, a.date_time + make_interval(mins => GREATEST(1, a.duration_minutes)), '[)')
--         && tstzrange(b.date_time, b.date_time + make_interval(mins => GREATEST(1, b.duration_minutes)), '[)');
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS time_range tstzrange
  GENERATED ALWAYS AS (
    tstzrange(
      date_time,
      date_time + make_interval(mins => GREATEST(1, COALESCE(duration_minutes, 30))),
      '[)'
    )
  ) STORED;

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
      EXCLUDE USING gist (time_range WITH &&)
      WHERE (status IN ('confirmada', 'aguardando_pagamento'));
  END IF;
END $$;
