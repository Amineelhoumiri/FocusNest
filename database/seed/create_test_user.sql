-- Create a test user that satisfies the users schema
-- Run with: psql -d your_db_name -f database/seed/create_test_user.sql

BEGIN;

-- Ensure UUID generation is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert a deterministic test user (id is random UUID, email unique)
INSERT INTO users (
  user_id,
  full_name,
  email,
  date_of_birth,
  role,
  is_consented_core,
  is_consented_ai,
  is_consented_ai_spotify,
  last_login_at
) VALUES (
  gen_random_uuid(),
  'Test User',
  'test.user@example.com',
  DATE '1995-05-20',
  'customer',
  TRUE,
  TRUE,
  FALSE,
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Show the inserted/existing user
SELECT user_id, full_name, email, date_of_birth, role, created_at, last_login_at
FROM users
WHERE email = 'test.user@example.com';

COMMIT;
