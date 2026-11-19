-- Persistent media identity and non-destructive quarantine for Backblaze B2.
-- Apply with the Supabase migration workflow before deploying the matching API.
-- This migration creates metadata only; it never reads, moves, or deletes B2 objects.

create table if not exists public.b2_media_assets (
  asset_id uuid primary key default gen_random_uuid(),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  access_scope text not null check (access_scope in ('public', 'private')),
  storage_key text not null unique,
  status text not null default 'uploading'
    check (status in ('uploading', 'ready', 'failed', 'quarantined')),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  metadata jsonb not null default '{}'::jsonb,
  claim_token uuid,
  claim_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (access_scope, sha256)
);

create index if not exists b2_media_assets_status_updated_idx
  on public.b2_media_assets (status, updated_at desc);

create table if not exists public.b2_media_variants (
  variant_id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.b2_media_assets(asset_id) on delete restrict,
  variant_name text not null,
  transform_key text not null,
  storage_key text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now(),
  unique (asset_id, variant_name, transform_key)
);

create table if not exists public.b2_media_quarantine (
  object_key text primary key,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'referenced', 'eligible_for_manual_review', 'cancelled')),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reason text not null,
  reference_count integer,
  last_reconciled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.b2_media_assets enable row level security;
alter table public.b2_media_variants enable row level security;
alter table public.b2_media_quarantine enable row level security;

grant all on public.b2_media_assets to service_role;
grant all on public.b2_media_variants to service_role;
grant all on public.b2_media_quarantine to service_role;

create or replace function public.claim_b2_media_asset(
  p_sha256 text,
  p_access_scope text,
  p_storage_key text,
  p_mime_type text,
  p_size_bytes bigint,
  p_claim_token uuid,
  p_original_name text,
  p_processing_version text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset public.b2_media_assets%rowtype;
begin
  insert into public.b2_media_assets (
    sha256, access_scope, storage_key, status, mime_type, size_bytes,
    metadata, claim_token, claim_expires_at, updated_at
  ) values (
    lower(p_sha256), p_access_scope, p_storage_key, 'uploading', p_mime_type,
    p_size_bytes, jsonb_build_object('originalName', left(coalesce(p_original_name, ''), 255)),
    p_claim_token, now() + interval '20 minutes', now()
  )
  on conflict (access_scope, sha256) do update
    set storage_key = excluded.storage_key,
        status = 'uploading',
        mime_type = excluded.mime_type,
        size_bytes = excluded.size_bytes,
        metadata = public.b2_media_assets.metadata || excluded.metadata,
        claim_token = excluded.claim_token,
        claim_expires_at = excluded.claim_expires_at,
        updated_at = now()
    where public.b2_media_assets.status = 'failed'
       or (public.b2_media_assets.status = 'ready'
           and public.b2_media_assets.metadata->>'processingVersion' is distinct from p_processing_version)
       or (public.b2_media_assets.status = 'uploading'
           and public.b2_media_assets.claim_expires_at < now())
  returning * into v_asset;

  if found then
    return jsonb_build_object(
      'assetId', v_asset.asset_id,
      'storageKey', v_asset.storage_key,
      'status', v_asset.status,
      'shouldUpload', true,
      'claimToken', v_asset.claim_token
    );
  end if;

  select * into v_asset
    from public.b2_media_assets
   where access_scope = p_access_scope and sha256 = lower(p_sha256);

  if not found then
    raise exception 'Could not claim media asset';
  end if;

  if v_asset.status = 'ready'
     and v_asset.metadata->>'processingVersion' = p_processing_version then
    return jsonb_build_object(
      'assetId', v_asset.asset_id,
      'storageKey', v_asset.storage_key,
      'status', v_asset.status,
      'shouldUpload', false,
      'mediaItem', v_asset.metadata->'mediaItem'
    );
  end if;

  return jsonb_build_object(
    'assetId', v_asset.asset_id,
    'storageKey', v_asset.storage_key,
    'status', v_asset.status,
    'shouldUpload', false,
    'retryAfterSeconds', 5
  );
end;
$$;

create or replace function public.complete_b2_media_asset(
  p_asset_id uuid,
  p_claim_token uuid,
  p_media_item jsonb,
  p_variants jsonb
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_variant jsonb;
begin
  update public.b2_media_assets
     set status = 'ready',
         metadata = metadata || jsonb_build_object(
           'mediaItem', p_media_item,
           'processingVersion', p_media_item->>'processingVersion'
         ),
         claim_token = null,
         claim_expires_at = null,
         updated_at = now()
   where asset_id = p_asset_id
     and claim_token = p_claim_token
     and status = 'uploading';

  if not found then return false; end if;

  for v_variant in select * from jsonb_array_elements(coalesce(p_variants, '[]'::jsonb)) loop
    insert into public.b2_media_variants (
      asset_id, variant_name, transform_key, storage_key,
      mime_type, size_bytes
    ) values (
      p_asset_id,
      v_variant->>'name',
      v_variant->>'transformKey',
      v_variant->>'key',
      v_variant->>'mimeType',
      greatest(0, coalesce((v_variant->>'sizeBytes')::bigint, 0))
    )
    on conflict (asset_id, variant_name, transform_key) do update
      set storage_key = excluded.storage_key,
          mime_type = excluded.mime_type,
          size_bytes = excluded.size_bytes;
  end loop;

  return true;
end;
$$;

create or replace function public.fail_b2_media_asset(
  p_asset_id uuid,
  p_claim_token uuid,
  p_error_code text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.b2_media_assets
     set status = 'failed',
         metadata = metadata || jsonb_build_object('lastErrorCode', left(coalesce(p_error_code, 'upload_failed'), 80)),
         claim_token = null,
         claim_expires_at = null,
         updated_at = now()
   where asset_id = p_asset_id
     and claim_token = p_claim_token
     and status = 'uploading';
  return found;
end;
$$;

revoke all on function public.claim_b2_media_asset(text, text, text, text, bigint, uuid, text, text) from public, anon, authenticated;
revoke all on function public.complete_b2_media_asset(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.fail_b2_media_asset(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_b2_media_asset(text, text, text, text, bigint, uuid, text, text) to service_role;
grant execute on function public.complete_b2_media_asset(uuid, uuid, jsonb, jsonb) to service_role;
grant execute on function public.fail_b2_media_asset(uuid, uuid, text) to service_role;
