-- Migration: Ampliar site_content.key de VARCHAR(64) para TEXT
-- Motivo: Chaves do Cofre (vault:challenge:<sha256> = 80 chars, vault:device:<uuid>:<sha256> = 114 chars,
-- vault:visit:<sha256> = 76 chars) e chaves de rate limit com SHA-256 (88-95 chars) excediam VARCHAR(64),
-- causando HTTP 503 (reason: challenge_store) em /api/me/cofre e falha silenciosa de rate limits.

ALTER TABLE public.site_content
  ALTER COLUMN key TYPE text;
