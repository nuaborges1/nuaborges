-- ============================================================================
-- Migration: Sistema Temporário de Avaliação do Pré-lançamento — NUA Borges
-- ============================================================================
-- IMPORTANTE: Não aplicar automaticamente em produção sem autorização explícita.
-- Tabelas isoladas com RLS estrito (acesso exclusivamente via service_role no backend).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prelaunch_feedback_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  collection_active BOOLEAN NOT NULL DEFAULT TRUE,
  hide_from_sidebar BOOLEAN NOT NULL DEFAULT FALSE,
  retention_days INTEGER NOT NULL DEFAULT 90 CHECK (retention_days >= 7 AND retention_days <= 365),
  closed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.prelaunch_feedback_settings (id, collection_active, hide_from_sidebar, retention_days)
VALUES (1, TRUE, FALSE, 90)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.prelaunch_feedback_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_code TEXT NOT NULL UNIQUE,
  code_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'in_progress', 'completed', 'revoked')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  response_id UUID,
  created_by TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prelaunch_links_status
  ON public.prelaunch_feedback_links (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.prelaunch_feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL UNIQUE REFERENCES public.prelaunch_feedback_links(id) ON DELETE RESTRICT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  overall_rating SMALLINT CHECK (overall_rating IS NULL OR (overall_rating >= 1 AND overall_rating <= 5)),
  appearance_rating SMALLINT CHECK (appearance_rating IS NULL OR (appearance_rating >= 1 AND appearance_rating <= 5)),
  device_used TEXT,
  areas_visited TEXT[] NOT NULL DEFAULT '{}',
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_status TEXT NOT NULL DEFAULT 'new'
    CHECK (review_status IN ('new', 'in_review', 'reviewed')),
  admin_notes TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prelaunch_responses_submitted
  ON public.prelaunch_feedback_responses (submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_prelaunch_responses_review
  ON public.prelaunch_feedback_responses (review_status);

CREATE TABLE IF NOT EXISTS public.prelaunch_feedback_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.prelaunch_feedback_responses(id) ON DELETE CASCADE,
  link_id UUID NOT NULL REFERENCES public.prelaunch_feedback_links(id) ON DELETE RESTRICT,
  participant_name TEXT NOT NULL,
  area TEXT NOT NULL,
  what_trying TEXT NOT NULL,
  what_happened TEXT NOT NULL,
  what_expected TEXT NOT NULL DEFAULT '',
  happened_more_than_once TEXT NOT NULL DEFAULT 'not_tried'
    CHECK (happened_more_than_once IN ('yes', 'no', 'not_tried')),
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  issue_status TEXT NOT NULL DEFAULT 'new'
    CHECK (issue_status IN ('new', 'in_review', 'resolved', 'dismissed')),
  admin_notes TEXT NOT NULL DEFAULT '',
  cluster_key TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prelaunch_issues_status_area
  ON public.prelaunch_feedback_issues (issue_status, area, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prelaunch_issues_response
  ON public.prelaunch_feedback_issues (response_id);

-- RLS estrito: bloqueia qualquer leitura/escrita pública (somente service_role via Pages Functions)
ALTER TABLE public.prelaunch_feedback_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prelaunch_feedback_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prelaunch_feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prelaunch_feedback_issues ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.prelaunch_feedback_settings FROM anon, authenticated;
REVOKE ALL ON public.prelaunch_feedback_links FROM anon, authenticated;
REVOKE ALL ON public.prelaunch_feedback_responses FROM anon, authenticated;
REVOKE ALL ON public.prelaunch_feedback_issues FROM anon, authenticated;

-- ============================================================================
-- RPC Atômica de Envio Único por Link (previne concorrência / duplo envio)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_prelaunch_feedback_atomic(
  p_code_hash TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_overall_rating SMALLINT,
  p_appearance_rating SMALLINT,
  p_device_used TEXT,
  p_areas_visited TEXT[],
  p_answers JSONB,
  p_issues JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active BOOLEAN;
  v_link public.prelaunch_feedback_links%ROWTYPE;
  v_response_id UUID;
  v_participant TEXT;
  v_issue JSONB;
BEGIN
  SELECT collection_active INTO v_active
  FROM public.prelaunch_feedback_settings
  WHERE id = 1;

  IF COALESCE(v_active, TRUE) = FALSE THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'COLLECTION_CLOSED');
  END IF;

  SELECT * INTO v_link
  FROM public.prelaunch_feedback_links
  WHERE code_hash = p_code_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'INVALID_LINK');
  END IF;

  IF v_link.status = 'completed' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ALREADY_COMPLETED');
  END IF;

  IF v_link.status = 'revoked' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'REVOKED_LINK');
  END IF;

  v_participant := TRIM(p_first_name) || ' ' || TRIM(p_last_name);

  INSERT INTO public.prelaunch_feedback_responses (
    link_id,
    first_name,
    last_name,
    overall_rating,
    appearance_rating,
    device_used,
    areas_visited,
    answers
  )
  VALUES (
    v_link.id,
    TRIM(p_first_name),
    TRIM(p_last_name),
    p_overall_rating,
    p_appearance_rating,
    COALESCE(p_device_used, ''),
    COALESCE(p_areas_visited, '{}'),
    COALESCE(p_answers, '{}'::jsonb)
  )
  RETURNING id INTO v_response_id;

  IF p_issues IS NOT NULL AND jsonb_typeof(p_issues) = 'array' THEN
    FOR v_issue IN SELECT * FROM jsonb_array_elements(p_issues)
    LOOP
      INSERT INTO public.prelaunch_feedback_issues (
        response_id,
        link_id,
        participant_name,
        area,
        what_trying,
        what_happened,
        what_expected,
        happened_more_than_once,
        attachments,
        cluster_key
      )
      VALUES (
        v_response_id,
        v_link.id,
        v_participant,
        COALESCE(v_issue->>'area', 'Outro lugar'),
        COALESCE(v_issue->>'whatTrying', ''),
        COALESCE(v_issue->>'whatHappened', ''),
        COALESCE(v_issue->>'whatExpected', ''),
        CASE
          WHEN (v_issue->>'happenedMoreThanOnce') IN ('yes', 'no', 'not_tried')
            THEN v_issue->>'happenedMoreThanOnce'
          ELSE 'not_tried'
        END,
        COALESCE(v_issue->'attachments', '[]'::jsonb),
        COALESCE(v_issue->>'clusterKey', '')
      );
    END LOOP;
  END IF;

  UPDATE public.prelaunch_feedback_links
  SET
    status = 'completed',
    completed_at = NOW(),
    response_id = v_response_id,
    updated_at = NOW()
  WHERE id = v_link.id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'responseId', v_response_id,
    'linkId', v_link.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_prelaunch_feedback_atomic(TEXT, TEXT, TEXT, SMALLINT, SMALLINT, TEXT, TEXT[], JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_prelaunch_feedback_atomic(TEXT, TEXT, TEXT, SMALLINT, SMALLINT, TEXT, TEXT[], JSONB, JSONB) TO service_role;
