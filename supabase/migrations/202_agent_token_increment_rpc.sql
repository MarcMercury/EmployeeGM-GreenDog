-- ============================================================================
-- MIGRATION 202: Atomic token increment for agent budget tracking
-- Prevents race condition when multiple agent runs update tokens concurrently
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_agent_tokens(p_agent_id TEXT, p_tokens INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE agent_registry
  SET daily_tokens_used = daily_tokens_used + p_tokens,
      updated_at = now()
  WHERE agent_id = p_agent_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_agent_tokens(TEXT, INTEGER) TO authenticated;
