-- Find all chat messages for a given user full_name (generic SQL)
-- Works in any SQL client, including VS Code. Replace the placeholder string.
-- Example: set your user name below between single quotes.

SELECT
  cm.chat_message_id,
  cs.chat_session_id,
  u.full_name,
  cm.role,
  encode(cm.content, 'escape') AS content_preview,
  cm.token_count,
  cm.created_at
FROM chat_messages AS cm
JOIN chat_sessions AS cs ON cm.chat_session_id = cs.chat_session_id
JOIN users AS u ON cs.user_id = u.user_id
WHERE u.full_name = 'Cascade Tester'  -- <-- replace with your user name
ORDER BY cm.created_at;

-- Pattern match alternative (case-insensitive):
-- WHERE u.full_name ILIKE '%Cascade Tester%'
