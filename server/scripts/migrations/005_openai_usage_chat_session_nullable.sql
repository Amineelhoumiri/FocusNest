-- Migration 005: Make openai_usage.chat_session_id nullable
-- AI routes (/api/ai/*) log token usage without an associated chat session.
-- The NOT NULL constraint caused insert failures on every AI-only route call.
ALTER TABLE public.openai_usage
  ALTER COLUMN chat_session_id DROP NOT NULL;
