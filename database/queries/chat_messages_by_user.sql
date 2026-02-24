-- Find all chat messages for a given user full_name
-- Usage (psql):
--   psql -d your_db_name -v full_name='Cascade Tester' -f database/queries/chat_messages_by_user.sql

WITH selected_user AS (
  SELECT user_id FROM users WHERE full_name = :'full_name'
)
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
WHERE u.user_id IN (SELECT user_id FROM selected_user)
ORDER BY cm.created_at;

-- Pattern search alternative: run this block by replacing the WHERE clause above
-- to use partial, case-insensitive name matching instead of exact match:
-- WHERE u.full_name ILIKE '%' || :'full_name' || '%'