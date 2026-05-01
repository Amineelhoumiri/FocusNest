# FocusNest — Backend Documentation

The backend is an **Express 5 / Node.js 22** API that exposes a REST interface consumed by the React SPA. It follows a strict three-layer architecture (Routes → Controllers → Services) on top of a PostgreSQL database.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Middleware Stack](#middleware-stack)
3. [Authentication & Sessions](#authentication--sessions)
4. [Encryption](#encryption)
5. [API Modules](#api-modules)
   - [Auth](#auth)
   - [Users](#users)
   - [Tasks](#tasks)
   - [Subtasks](#subtasks)
   - [Focus Sessions](#focus-sessions)
   - [AI Chat](#ai-chat)
   - [AI Prompts](#ai-prompts)
   - [Spotify / Music](#spotify--music)
   - [GDPR & Consent](#gdpr--consent)
   - [Admin](#admin)
   - [Uploads](#uploads)
6. [Services](#services)
7. [Database](#database)
8. [Scripts](#scripts)
9. [Testing](#testing)
10. [Health Endpoints](#health-endpoints)

---

## Architecture

```
server/
├── index.js              — Express entry point; mounts middleware and routes
├── auth.js               — Better Auth configuration
├── instrument.js         — Sentry SDK initialization
├── startup-check.js      — DB connectivity validation at boot
├── dev-env-defaults.js   — Non-secret defaults for local development
│
├── config/
│   ├── db.js             — pg Pool (PostgreSQL, SSL-aware)
│   └── allowedOrigins.js — CORS allowed-origins resolver
│
├── middleware/
│   ├── auth.js           — Better Auth session validation
│   ├── isAdmin.js        — is_admin flag gate
│   ├── api-rate-limit.js — express-rate-limit (400/15 min; 30/min for consent)
│   └── csrf-config.js    — csrf-csrf double-submit cookie
│
├── routes/               — Express Router files (one per domain)
├── controllers/          — Business logic (one per domain)
└── services/             — Shared utilities (AI, encryption, mail, Spotify, tokens)
```

**Request lifecycle:**

```
Request → Helmet → CORS → Cookie-parser → Rate-limit → CSRF
        → Route match
        → auth middleware (session validation)
        → isAdmin (admin-only routes)
        → Controller → Service → PostgreSQL
        → Response
```

---

## Middleware Stack

| Middleware | Purpose |
|-----------|---------|
| `helmet` | Security headers (CSP disabled for OAuth/Vite compatibility) |
| `cors` | Origin whitelist from `ALLOWED_ORIGINS` + `CLIENT_URL` env vars |
| `cookie-parser` | Parses HTTP-only session and CSRF cookies |
| `api-rate-limit` | 400 requests per IP per 15 minutes (global); 30/min on consent writes |
| `csrf-config` | Double-submit CSRF tokens; skips `/api/auth/*` (except `/api/auth/consent`) |
| `auth` (Better Auth) | Validates session cookie; injects `req.user` |
| `isAdmin` | Verifies `req.user.is_admin === true`; returns 403 otherwise |

---

## Authentication & Sessions

Authentication is handled by **[Better Auth](https://better-auth.com/)** (`server/auth.js`).

- Sessions are stored as HTTP-only, `Secure`, `SameSite=Lax` cookies — no tokens in localStorage or query strings
- Email/password registration with optional email verification (`REQUIRE_EMAIL_VERIFICATION`)
- OAuth providers: **Google** and **Apple** (configured via `GOOGLE_CLIENT_ID` / `APPLE_*` env vars)
- Password reset flow via Resend transactional email
- Better Auth manages its own schema tables (`user`, `session`, `account`, `verification`) alongside the application tables

**Session validation** (`server/middleware/auth.js`):

```js
// Injects req.user on every authenticated route
const session = await auth.api.getSession({ headers: req.headers });
if (!session) return res.status(401).json({ error: 'Unauthorized' });
req.user = session.user;
```

---

## Encryption

All PII and sensitive user content is **encrypted at rest** before being written to PostgreSQL, stored as `BYTEA` columns. Decryption happens in the controller layer immediately before serializing the response.

**Encrypted fields:**

| Table | Field | Why |
|-------|-------|-----|
| `account` | `encrypted_email` | PII — email address |
| `tasks` | `task_name` | Sensitive personal data |
| `subtasks` | `subtask_name` | Sensitive personal data |
| `session` | `reflection_content` | Potentially sensitive mental health data |
| `chat_messages` | `content` | Private AI conversation content |
| `spotify_tokens` | `access_token`, `refresh_token` | OAuth credentials |

**Encryption service** (`server/services/encryption.service.js`):

- **Production**: AWS KMS — data key generated per encrypt call; key ID from `KMS_KEY_ID` env var
- **Development**: AES-256-GCM with a local `ENCRYPTION_KEY` (32-byte hex)
- API: `encrypt(plaintext: string) → Buffer` / `decrypt(ciphertext: Buffer) → string`

---

## API Modules

Full OpenAPI 3.0 spec: [`docs/swagger.yaml`](swagger.yaml)

### Auth

**File:** `routes/auth.routes.js` → `controllers/auth.controller.js`

Better Auth handles the auth flow natively. The routes file mounts the Better Auth handler at `/api/auth/*`. Custom application-level logic (e.g. creating the `users` row after registration) is handled via Better Auth hooks.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/sign-up/email` | Register with email + password |
| `POST` | `/api/auth/sign-in/email` | Login; sets session cookie |
| `POST` | `/api/auth/sign-out` | Destroys session |
| `POST` | `/api/auth/forget-password` | Sends password reset email |
| `POST` | `/api/auth/reset-password` | Resets password with token |
| `GET` | `/api/auth/verify-email` | Verifies email address |
| `GET` | `/api/auth/callback/:provider` | OAuth callback (Google, Apple) |

### Users

**File:** `routes/users.routes.js` → `controllers/users.controller.js`

All routes require an active session.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users/me` | Returns decrypted user profile (email from `account` table) |
| `PATCH` | `/api/users/me` | Partial update via dynamic `$n` parameter array |
| `POST` | `/api/users/me/password` | Change password (requires current password) |
| `GET` | `/api/users/me/export` | GDPR data export — tasks, sessions, chat, consent log as JSON |
| `DELETE` | `/api/users/me/nuke` | Full account deletion with CASCADE; requires password confirmation |

### Tasks

**File:** `routes/tasks.routes.js` → `controllers/tasks.controller.js`

Implements Kanban columns: `Backlog` → `Ready` → `Doing` → `Done`.

**Business rule (FR-C-02):** Only **one** task may be in `Doing` at a time. This is enforced at the controller level — moving a task to `Doing` checks for an existing active task and returns `409` if one exists.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tasks` | List all tasks for the authenticated user (decrypted names) |
| `POST` | `/api/tasks` | Create a task; encrypts `task_name` before insert |
| `GET` | `/api/tasks/:id` | Single task (decrypted) |
| `PATCH` | `/api/tasks/:id` | Update status, energy level, or other fields |
| `DELETE` | `/api/tasks/:id` | Delete task (cascades to subtasks and sessions) |

### Subtasks

**File:** `routes/subtasks.routes.js` → `controllers/subtasks.controller.js`

Subtasks support an AI approval flow: AI-generated subtasks land with `is_approved = FALSE` and must be explicitly approved by the user.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tasks/:task_id/subtasks` | List subtasks (decrypted) |
| `POST` | `/api/tasks/:task_id/subtasks` | Create subtask; encrypts name |
| `PATCH` | `/api/tasks/:task_id/subtasks/:id` | Update status or approve (`is_approved = TRUE`) |
| `DELETE` | `/api/tasks/:task_id/subtasks/:id` | Delete subtask |

### Focus Sessions

**File:** `routes/sessions.routes.js` → `controllers/sessions.controller.js`

Manages the 5-minute Micro-Timer lifecycle.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sessions` | Session history for the authenticated user |
| `POST` | `/api/sessions` | Start a session — sets `is_active = TRUE`, records `started_at` |
| `PATCH` | `/api/sessions/:id` | End session — records `ended_at`, stores encrypted reflection |
| `POST` | `/api/sessions/:id/switch` | "I'm Stuck" — reassigns `task_id` without stopping the timer |

**Reflection types (FR-C-08):** `distraction` · `low_energy` · `external`

### AI Chat

**File:** `routes/chat.routes.js` → `controllers/chat.controller.js`

Stateful conversation threading using `chat_sessions` and `chat_messages` tables. Message content is encrypted at rest.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/chat` | List chat sessions for the user |
| `POST` | `/api/chat` | Create a new chat session or send a message to an existing one |
| `GET` | `/api/chat/:session_id` | Full message history (ascending order) for LLM context injection |
| `DELETE` | `/api/chat/:session_id` | Delete a chat session and all messages |

### AI Prompts

**File:** `routes/ai.routes.js` → `services/ai.service.js`

Invokes OpenAI GPT-4 using system prompts stored in the `system_prompts` table (managed by Admin). Token usage is logged to `openai_usage`.

| Persona | Trigger |
|---------|---------|
| `deconstructor` | Break a task into subtasks |
| `prioritizer` | Rank the backlog by energy level and urgency |
| `conversational_coach` | General focus coaching chat |
| `momentum_builder` | Re-engagement after a distraction |

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ai/deconstruct` | AI subtask generation for a task |
| `POST` | `/api/ai/prioritize` | Backlog prioritization |
| `POST` | `/api/ai/chat` | Coaching conversation (uses `conversational_coach` persona) |

### Spotify / Music

**Files:** `routes/spotify.routes.js` / `routes/music.routes.js` → `controllers/spotify.controller.js` / `services/spotify.service.js`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/spotify/auth-url` | Returns Spotify OAuth authorization URL |
| `GET` | `/api/spotify/callback` | Exchanges code for tokens; encrypts and stores them |
| `POST` | `/api/spotify/refresh` | Refreshes the Spotify access token |
| `DELETE` | `/api/spotify/disconnect` | Revokes stored tokens |
| `GET` | `/api/music/playlists` | Returns curated playlists (Spotify + YouTube) |

### GDPR & Consent

**File:** `routes/consent.routes.js` → `controllers/consent.controller.js`

Manages opt-in consent for data processing features (core, AI, Spotify). Every change is appended to an **immutable audit log** within a single DB transaction.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/consent` | Current consent flags for the user |
| `PATCH` | `/api/consent` | Update flags; writes IP + timestamp to `consent_audit_log` |

The `PATCH` handler runs inside a `BEGIN` / `COMMIT` / `ROLLBACK` transaction block — if the audit log insert fails, the consent update is rolled back.

Rate-limited separately: **30 requests / minute** per IP.

### Admin

**File:** `routes/admin.routes.js` → `controllers/admin.controller.js`

Requires `is_admin = TRUE` (enforced by `isAdmin` middleware). Provides observability and system-prompt management without exposing user content.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/usage` | OpenAI token usage log (prompt/content fields masked) |
| `GET` | `/api/admin/prompts` | List all system prompts |
| `PATCH` | `/api/admin/prompts/:id` | Update a system prompt body |
| `GET` | `/api/admin/users` | User list (no PII — aggregated stats only) |

### Uploads

**File:** `routes/upload.routes.js`

Handles PDF uploads (via `multer`) for AI-assisted task planning from documents.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload/pdf` | Upload a PDF; parsed with `pdf-parse`; content passed to AI |

---

## Services

| File | Responsibility |
|------|---------------|
| `services/ai.service.js` | OpenAI API calls; selects system prompt by persona name; logs token usage to `openai_usage` |
| `services/encryption.service.js` | AES-256-GCM encrypt/decrypt; uses AWS KMS in prod, local key in dev |
| `services/mail.service.js` | Resend integration — sends verification and password reset emails |
| `services/spotify.service.js` | Spotify Web API wrapper — playlist fetch, token exchange, refresh |
| `services/token.service.js` | JWT utilities (used for short-lived internal tokens) |

---

## Database

Schema: [`database/schema/focusnest_db.sql`](../database/schema/focusnest_db.sql)

Migrations: `server/scripts/migrations/` — applied manually or via a deployment script.

| Table | Description |
|-------|-------------|
| `users` | Core user profile (full_name, DOB, address, is_admin, consent flags) |
| `account` | Better Auth accounts; stores `encrypted_email` as BYTEA |
| `session` (Better Auth) | Active user sessions |
| `verification` | Email verification + password reset tokens |
| `tasks` | Kanban tasks; `task_name` stored as encrypted BYTEA |
| `subtasks` | Child tasks; `subtask_name` as encrypted BYTEA; `is_approved` flag |
| `focus_sessions` | Timer records; `reflection_content` as encrypted BYTEA |
| `chat_sessions` | AI conversation thread headers |
| `chat_messages` | Individual messages; `content` as encrypted BYTEA; `role`, token counts |
| `consent_audit_log` | Immutable GDPR audit trail (IP, timestamp, consent flags snapshot) |
| `openai_usage` | Per-request token logging (model, prompt_tokens, completion_tokens, cost) |
| `system_prompts` | Editable AI persona prompts (name, body, is_active) |
| `spotify_tokens` | Encrypted OAuth tokens per user |
| `curated_playlists` | Spotify + YouTube playlist metadata |

**Connection:** `server/config/db.js` creates a `pg.Pool`. SSL is enabled by default (required for AWS RDS); set `DB_SSL=false` for local dev.

---

## Scripts

Run from the `server/` directory with `node scripts/<file>`.

| Script | Usage |
|--------|-------|
| `scripts/seedAiPrompts.js` | Inserts the four default Finch AI personas into `system_prompts` |
| `scripts/makeAdmin.js` | Promotes a user to `is_admin = TRUE` by email |
| `scripts/purgeInactiveUsers.js` | GDPR: hard-deletes users inactive for >180 days (also runs via `npm run purge:inactive`) |
| `scripts/migrations/*.sql` | Schema migrations — apply with `psql -f <file>` |

---

## Testing

Tests use **Jest** with a dedicated test Express app (`tests/helpers/app.js`) and a mock auth helper (`tests/helpers/mockAuth.js`) that bypasses the Better Auth session check.

```bash
cd server
npm test          # run all tests once
npm run test:watch  # watch mode
```

**Coverage areas:**

| File | Routes tested |
|------|--------------|
| `tests/auth.test.js` | Register, login |
| `tests/users.test.js` | Profile, export, nuke |
| `tests/tasks.test.js` | CRUD, Kanban constraint |
| `tests/subtasks.test.js` | CRUD, approval flow |
| `tests/sessions.test.js` | Start, end, switch |
| `tests/chat.test.js` | Threads, messages |
| `tests/ai.test.js` | Deconstruct, prioritize |
| `tests/consent.test.js` | Flags, audit log |
| `tests/spotify.test.js` | OAuth flow, token refresh |
| `tests/admin.test.js` | Usage log, prompts |
| `tests/allowedOrigins.test.js` | CORS config unit test |

---

## Health Endpoints

These are unauthenticated and used by App Runner and load balancers.

| Path | Checks |
|------|--------|
| `GET /api/health` | Returns `200 OK` — liveness only, no DB access |
| `GET /api/ready` | Runs `SELECT 1` against the DB pool; returns `503` if unavailable |
