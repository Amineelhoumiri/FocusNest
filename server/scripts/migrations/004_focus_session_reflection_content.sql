-- Optional reflection note (encrypted at application layer) when user leaves a session early.
ALTER TABLE focus_session ADD COLUMN IF NOT EXISTS reflection_content BYTEA;
