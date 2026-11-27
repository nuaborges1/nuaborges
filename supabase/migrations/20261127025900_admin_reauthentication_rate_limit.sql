-- Bring the durable critical-action rate limiter to environments where the
-- original security migration was applied partially.
BEGIN;
CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  bucket_key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_seconds INTEGER NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_counters_updated_idx
  ON public.rate_limit_counters (updated_at);

CREATE OR REPLACE FUNCTION public.increment_rate_limit_atomic(
  p_bucket_key TEXT,
  p_window_seconds INTEGER,
  p_max_requests INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_win INTEGER := GREATEST(1, LEAST(COALESCE(p_window_seconds, 60), 86400));
  v_max INTEGER := GREATEST(1, LEAST(COALESCE(p_max_requests, 60), 100000));
  v_row public.rate_limit_counters%ROWTYPE;
  v_retry INTEGER := 0;
BEGIN
  IF NULLIF(btrim(COALESCE(p_bucket_key, '')), '') IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', v_max,
      'retry_after_seconds', 0
    );
  END IF;

  INSERT INTO public.rate_limit_counters (bucket_key, window_start, window_seconds, hit_count, updated_at)
  VALUES (p_bucket_key, v_now, v_win, 1, v_now)
  ON CONFLICT (bucket_key) DO UPDATE
  SET
    window_start = CASE
      WHEN rate_limit_counters.window_start + make_interval(secs => rate_limit_counters.window_seconds) <= v_now
        THEN v_now
      ELSE rate_limit_counters.window_start
    END,
    window_seconds = v_win,
    hit_count = CASE
      WHEN rate_limit_counters.window_start + make_interval(secs => rate_limit_counters.window_seconds) <= v_now
        THEN 1
      ELSE rate_limit_counters.hit_count + 1
    END,
    updated_at = v_now
  RETURNING * INTO v_row;

  IF v_row.hit_count > v_max THEN
    v_retry := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM ((v_row.window_start + make_interval(secs => v_row.window_seconds)) - v_now)))::INTEGER
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'count', v_row.hit_count,
      'retry_after_seconds', v_retry
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', GREATEST(0, v_max - v_row.hit_count),
    'count', v_row.hit_count,
    'retry_after_seconds', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.increment_rate_limit_atomic(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit_atomic(TEXT, INTEGER, INTEGER) TO service_role;
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_counters FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rate_limit_counters FROM PUBLIC, anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
