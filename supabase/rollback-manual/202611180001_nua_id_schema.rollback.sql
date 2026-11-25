-- =============================================================================
-- Rollback Migration: 202611180001_nua_id_schema_rollback.sql
-- Plano de reversão seguro e documentado para o schema do NUA ID
-- =============================================================================

DROP TABLE IF EXISTS public.notification_events CASCADE;
DROP TABLE IF EXISTS public.customer_audit_events CASCADE;
DROP TABLE IF EXISTS public.order_claims CASCADE;
DROP TABLE IF EXISTS public.refunds CASCADE;
DROP TABLE IF EXISTS public.payment_events CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.entitlements CASCADE;
DROP TABLE IF EXISTS public.customer_sessions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

ALTER TABLE public.orders DROP COLUMN IF EXISTS profile_id;
ALTER TABLE public.orders DROP COLUMN IF EXISTS source;
ALTER TABLE public.appointments DROP COLUMN IF EXISTS profile_id;
ALTER TABLE public.personalizados_orders DROP COLUMN IF EXISTS profile_id;
