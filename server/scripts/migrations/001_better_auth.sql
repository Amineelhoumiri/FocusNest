-- ─────────────────────────────────────────────────────────────────────────────
-- Better Auth tables migration (v2 — correct camelCase column names)
-- Better Auth uses Kysely under the hood, which stores columns in camelCase.
-- additionalFields use the exact names defined in auth.js (snake_case here).
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop existing tables if they exist (safe re-run)
DROP TABLE IF EXISTS verification CASCADE;
DROP TABLE IF EXISTS account CASCADE;
DROP TABLE IF EXISTS session CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- "user" table — Better Auth's primary user record.
-- Quoted because `user` is a reserved keyword in PostgreSQL.
CREATE TABLE IF NOT EXISTS "user" (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  image           TEXT,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW(),

  -- additionalFields defined in server/auth.js
  full_name           TEXT,
  date_of_birth       TEXT,
  is_admin            BOOLEAN DEFAULT FALSE,
  is_consented_ai     BOOLEAN DEFAULT FALSE,
  is_consented_spotify BOOLEAN DEFAULT FALSE
);

-- session table — active Better Auth sessions.
CREATE TABLE IF NOT EXISTS session (
  id           TEXT PRIMARY KEY,
  "expiresAt"  TIMESTAMP NOT NULL,
  token        TEXT NOT NULL UNIQUE,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMP NOT NULL DEFAULT NOW(),
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "userId"     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

-- account table — OAuth + credential accounts per user.
CREATE TABLE IF NOT EXISTS account (
  id                        TEXT PRIMARY KEY,
  "accountId"               TEXT NOT NULL,
  "providerId"              TEXT NOT NULL,
  "userId"                  TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken"             TEXT,
  "refreshToken"            TEXT,
  "idToken"                 TEXT,
  "accessTokenExpiresAt"    TIMESTAMP,
  "refreshTokenExpiresAt"   TIMESTAMP,
  scope                     TEXT,
  password                  TEXT,
  "createdAt"               TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"               TIMESTAMP NOT NULL DEFAULT NOW()
);

-- verification table — email / magic-link tokens.
CREATE TABLE IF NOT EXISTS verification (
  id          TEXT PRIMARY KEY,
  identifier  TEXT NOT NULL,
  value       TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP
);
