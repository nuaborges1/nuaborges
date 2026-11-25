-- =============================================================================
-- Migration: 202611210001_security_rls_and_rpc_hardening.sql
--
-- Corrige achados críticos de auditoria pré-entrega (AUD-007, AUD-028, AUD-PRE-002):
-- 1. Adiciona colunas faltantes (`entitlements.title`, `entitlements.allow_download`,
--    `refunds.order_ref`) alinhadas ao contrato TypeScript.
-- 2. Habilita e força RLS + revoga privilégios de anon/authenticated em todas as
--    tabelas administrativas/backend.
-- 3. Atualiza constraint GiST `appointments_no_overlap_active` sobre a coluna real
--    `time_range` incluindo `'reagendamento_pendente'`.
-- 4. Atualiza `reserve_vip_appointment(jsonb, integer)` e
--    `reschedule_vip_appointment(jsonb, integer)` mantendo a assinatura real do
--    backend e expirando holds pendentes vencidos DENTRO do advisory lock
--    (elimina colisão 23P01/503 com GiST em horários recém-expirados).
-- =============================================================================

-- 1. Colunas faltantes nas tabelas do NUA ID
alter table if exists public.entitlements
  add column if not exists title text,
  add column if not exists allow_download boolean not null default false;

alter table if exists public.refunds
  add column if not exists order_ref text;

do $$
begin
  if to_regclass('public.refunds') is not null then
    create index if not exists refunds_order_ref_idx on public.refunds (order_ref);
  end if;
end $$;

-- 2. Lockdown RLS em TODAS as tabelas de backend/sistema (acesso somente via service_role)
do $$
declare
  tbl text;
  backend_tables text[] := array[
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
begin
  foreach tbl in array backend_tables loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = tbl
    ) then
      execute format('alter table public.%I enable row level security;', tbl);
      execute format('alter table public.%I force row level security;', tbl);
      execute format('revoke all on table public.%I from anon, authenticated;', tbl);
    end if;
  end loop;
end $$;

-- 3. Garante extensão btree_gist, função IMMUTABLE appointment_slot_range e recria constraint GiST
--    incluindo 'reagendamento_pendente' (evita erro 42P17 em colunas geradas com timestamptz + interval)
create extension if not exists btree_gist;

create or replace function public.appointment_slot_range(
  p_start timestamptz,
  p_duration_minutes integer
)
returns tstzrange
language sql
immutable
set search_path = public, pg_temp
as $$
  select tstzrange(
    p_start,
    p_start + make_interval(mins => greatest(1, coalesce(p_duration_minutes, 30))),
    '[)'
  );
$$;

alter table if exists public.appointments
  drop constraint if exists appointments_no_overlap_active;

alter table if exists public.appointments
  add constraint appointments_no_overlap_active
  exclude using gist (public.appointment_slot_range(date_time, duration_minutes) with &&)
  where (status in ('confirmada', 'aguardando_pagamento', 'reagendamento_pendente'));

-- 4. Atualiza reserve_vip_appointment (assinatura real: jsonb, integer -> boolean)
--    expirando holds vencidos dentro do mesmo advisory lock antes da checagem/insert
create or replace function public.reserve_vip_appointment(
  p_booking jsonb,
  p_buffer_minutes integer default 0
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_buffer integer := greatest(0, least(coalesce(p_buffer_minutes, 0), 180));
  v_inserted integer;
  v_settings jsonb;
  v_timezone text;
  v_daily_limit_raw text;
  v_daily_limit integer;
  v_schedule_date date;
begin
  if jsonb_typeof(p_booking) <> 'object'
     or nullif(p_booking ->> 'id', '') is null
     or nullif(p_booking ->> 'date_time', '') is null then
    raise exception 'Invalid appointment payload';
  end if;

  v_start := (p_booking ->> 'date_time')::timestamptz;
  v_end := v_start + make_interval(mins => greatest(1, coalesce((p_booking ->> 'duration_minutes')::integer, 30)));
  select settings into v_settings from public.appointments_settings where id = 1;
  v_timezone := coalesce(nullif(v_settings ->> 'timezone', ''), 'Europe/Dublin');
  v_daily_limit_raw := nullif(btrim(coalesce(v_settings ->> 'dailyBookingLimit', '')), '');
  if v_daily_limit_raw is not null and v_daily_limit_raw ~ '^\d+$' then
    v_daily_limit := v_daily_limit_raw::integer;
  else
    v_daily_limit := null;
  end if;
  v_schedule_date := (v_start at time zone v_timezone)::date;

  -- Lock curto e transacional: evita que duas requisições passem na checagem juntas.
  perform pg_advisory_xact_lock(hashtext('nua:vip-appointment-reservation'));

  -- Expira holds vencidos dentro do mesmo lock antes de checar conflito ou inserir (evita 23P01/503 com GiST)
  update public.appointments a
     set status = 'cancelada',
         updated_at = now()
   where a.status = 'aguardando_pagamento'
     and a.expires_at is not null
     and a.expires_at <= now();

  -- Verifica sobreposição apenas contra reservas ativas no horário (incluindo pausa/buffer)
  if exists (
    select 1
      from public.appointments a
     where a.status in ('confirmada', 'aguardando_pagamento', 'reagendamento_pendente')
       and a.date_time < v_end + make_interval(mins => v_buffer)
       and a.date_time + make_interval(mins => greatest(1, coalesce(a.duration_minutes, 30) + v_buffer)) > v_start
  ) then
    return false;
  end if;

  -- Limite diário opcional (somente quando dailyBookingLimit > 0 está configurado)
  if v_daily_limit is not null and v_daily_limit > 0 and (
    select count(*)
      from public.appointments a
     where a.status in ('confirmada', 'aguardando_pagamento', 'reagendamento_pendente')
       and (a.date_time at time zone v_timezone)::date = v_schedule_date
  ) >= v_daily_limit then
    return false;
  end if;

  insert into public.appointments (
    id, public_token, client_name, client_contact, client_instagram,
    modality_id, date_time, duration_minutes, total_price, status,
    payment, call_link, notes, created_at, updated_at, expires_at
  ) values (
    p_booking ->> 'id',
    p_booking ->> 'public_token',
    coalesce(p_booking ->> 'client_name', ''),
    coalesce(p_booking ->> 'client_contact', ''),
    coalesce(p_booking ->> 'client_instagram', ''),
    p_booking ->> 'modality_id',
    v_start,
    coalesce((p_booking ->> 'duration_minutes')::integer, 30),
    coalesce((p_booking ->> 'total_price')::numeric, 0),
    p_booking ->> 'status',
    p_booking -> 'payment',
    coalesce(p_booking ->> 'call_link', ''),
    coalesce(p_booking ->> 'notes', ''),
    coalesce((p_booking ->> 'created_at')::timestamptz, now()),
    coalesce((p_booking ->> 'updated_at')::timestamptz, now()),
    coalesce((p_booking ->> 'expires_at')::timestamptz, now() + interval '15 minutes')
  )
  on conflict (id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted = 1;
end;
$$;

revoke all on function public.reserve_vip_appointment(jsonb, integer) from public, anon, authenticated;
grant execute on function public.reserve_vip_appointment(jsonb, integer) to service_role;

-- 5. Atualiza reschedule_vip_appointment (assinatura real: jsonb, integer -> boolean)
--    expirando holds vencidos dentro do mesmo advisory lock
create or replace function public.reschedule_vip_appointment(
  p_booking jsonb,
  p_buffer_minutes integer default 0
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id text := p_booking ->> 'id';
  v_start timestamptz := (p_booking ->> 'date_time')::timestamptz;
  v_duration integer := greatest(1, coalesce((p_booking ->> 'duration_minutes')::integer, 30));
  v_buffer integer := greatest(0, least(coalesce(p_buffer_minutes, 0), 180));
  v_updated integer;
  v_settings jsonb;
  v_timezone text;
  v_daily_limit_raw text;
  v_daily_limit integer;
  v_schedule_date date;
begin
  if nullif(v_id, '') is null or v_start is null then
    raise exception 'Invalid appointment payload';
  end if;

  select settings into v_settings from public.appointments_settings where id = 1;
  v_timezone := coalesce(nullif(v_settings ->> 'timezone', ''), 'Europe/Dublin');
  v_daily_limit_raw := nullif(btrim(coalesce(v_settings ->> 'dailyBookingLimit', '')), '');
  if v_daily_limit_raw is not null and v_daily_limit_raw ~ '^\d+$' then
    v_daily_limit := v_daily_limit_raw::integer;
  else
    v_daily_limit := null;
  end if;
  v_schedule_date := (v_start at time zone v_timezone)::date;

  perform pg_advisory_xact_lock(hashtext('nua:vip-appointment-reservation'));

  -- Expira holds vencidos dentro do mesmo lock antes de checar conflito ou atualizar
  update public.appointments a
     set status = 'cancelada',
         updated_at = now()
   where a.status = 'aguardando_pagamento'
     and a.expires_at is not null
     and a.expires_at <= now();

  if exists (
    select 1
      from public.appointments a
     where a.id <> v_id
       and a.status in ('confirmada', 'aguardando_pagamento', 'reagendamento_pendente')
       and a.date_time < v_start + make_interval(mins => v_duration + v_buffer)
       and a.date_time + make_interval(mins => greatest(1, coalesce(a.duration_minutes, 30) + v_buffer)) > v_start
  ) then
    return false;
  end if;

  if v_daily_limit is not null and v_daily_limit > 0 and (
    select count(*)
      from public.appointments a
     where a.id <> v_id
       and a.status in ('confirmada', 'aguardando_pagamento', 'reagendamento_pendente')
       and (a.date_time at time zone v_timezone)::date = v_schedule_date
  ) >= v_daily_limit then
    return false;
  end if;

  update public.appointments
     set date_time = v_start,
         duration_minutes = v_duration,
         status = p_booking ->> 'status',
         call_link = coalesce(p_booking ->> 'call_link', ''),
         notes = coalesce(p_booking ->> 'notes', ''),
         updated_at = coalesce((p_booking ->> 'updated_at')::timestamptz, now()),
         expires_at = coalesce((p_booking ->> 'expires_at')::timestamptz, expires_at)
   where id = v_id
     and status <> 'cancelada';

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.reschedule_vip_appointment(jsonb, integer) from public, anon, authenticated;
grant execute on function public.reschedule_vip_appointment(jsonb, integer) to service_role;
