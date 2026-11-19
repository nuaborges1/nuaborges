-- Rollback: 202611180002_appointments_exclusion_constraint_rollback.sql
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_no_overlap_active;
ALTER TABLE public.appointments DROP COLUMN IF EXISTS time_range;
