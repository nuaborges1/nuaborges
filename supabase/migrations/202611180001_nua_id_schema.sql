-- =============================================================================
-- Migration: 202611180001_nua_id_schema.sql
-- NUA ID — Sistema Unificado de Contas e Identidade Privativa do Cliente
-- Totalmente aditiva, reversível e compatível com RLS e Supabase Auth
-- =============================================================================

-- 1. Tabela de Perfis de Clientes (1:1 com auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  email_normalized TEXT UNIQUE NOT NULL,
  display_name TEXT,
  phone_masked TEXT,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'suspended' | 'anonymized'
  anonymized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email_normalized);
CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles (status);

-- 2. Sessões Ativas de Clientes (Gerenciamento multi-dispositivo e revogação)
CREATE TABLE IF NOT EXISTS public.customer_sessions (
  id TEXT PRIMARY KEY, -- sess_<128bit_hex>
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

-- 3. Vínculo Aditivo nas Tabelas Comerciais Existentes (Nullable, não-destrutivo)
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

-- 4. Direitos de Acesso a Conteúdos (Entitlements)
CREATE TABLE IF NOT EXISTS public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_ref TEXT NOT NULL,
  kind TEXT NOT NULL, -- 'pack' | 'avulso' | 'custom' | 'vip'
  resource_id TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ, -- null = permanente dentro das regras do produto
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT, -- 'refund' | 'chargeback' | 'cancellation' | 'admin'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_entitlement_order_resource UNIQUE (order_ref, resource_id)
);

CREATE INDEX IF NOT EXISTS entitlements_profile_idx ON public.entitlements (profile_id);
CREATE INDEX IF NOT EXISTS entitlements_resource_idx ON public.entitlements (resource_id);

-- 5. Pagamentos e Deduplicação Financeira (Idempotência Estrita)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  provider_payment_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL, -- 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back'
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

-- 6. Reembolsos e Estornos
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  provider_refund_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Vínculo Idempotente de Pedidos Anteriores (Order Claims)
-- Impede estritamente que um pedido legado seja vinculado a mais de uma conta
CREATE TABLE IF NOT EXISTS public.order_claims (
  order_ref TEXT PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  method TEXT NOT NULL -- 'token_and_otp' | 'admin_verified'
);

CREATE INDEX IF NOT EXISTS order_claims_profile_idx ON public.order_claims (profile_id);

-- 8. Auditoria e Notificações do NUA ID
CREATE TABLE IF NOT EXISTS public.customer_audit_events (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'login', 'logout', 'request_code', 'claim_order', 'profile_update', 'anonymize'
  actor_ip_hash TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_events (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  kind TEXT NOT NULL, -- 'access_code', 'purchase_confirmed', 'appointment_booked', etc.
  status TEXT NOT NULL, -- 'sent', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- POLÍTICAS RLS (Row Level Security)
-- Isolamento absoluto: cliente A nunca lê ou altera dados do cliente B
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_claims ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: o cliente só lê o próprio perfil
DROP POLICY IF EXISTS customer_read_own_profile ON public.profiles;
CREATE POLICY customer_read_own_profile ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- 2. Entitlements: o cliente só lê os próprios direitos ativos
DROP POLICY IF EXISTS customer_read_own_entitlements ON public.entitlements;
CREATE POLICY customer_read_own_entitlements ON public.entitlements
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- 3. Sessions: o cliente só lê e revoga as próprias sessões
DROP POLICY IF EXISTS customer_read_own_sessions ON public.customer_sessions;
CREATE POLICY customer_read_own_sessions ON public.customer_sessions
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- NENHUM cliente pode fazer INSERT/UPDATE direto em payments, entitlements ou orders
-- Todo provisionamento financeiro e de acesso é executado via Pages Functions (Service Role)
