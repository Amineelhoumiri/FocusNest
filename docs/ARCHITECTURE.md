# FocusNest — System Architecture

---

## High-Level Overview

FocusNest is a monorepo containing a **React SPA** (client) and an **Express API** (server) that are shipped together as a single Docker container in production.

```
┌─────────────────────────────────────────────┐
│                  Browser                     │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │        React SPA (Vite)              │   │
│  │                                      │   │
│  │  AuthContext · FocusScoreContext      │   │
│  │  ThemeContext · ZenModeContext        │   │
│  │  SpotifyPlaybackContext               │   │
│  │  YouTubePlaybackContext               │   │
│  └──────────────┬───────────────────────┘   │
│                 │  /api/* (HTTP-only cookies) │
└─────────────────┼────────────────────────────┘
                  │
      ┌───────────▼──────────────────────┐
      │        Express API (Node 22)      │
      │                                  │
      │  Helmet · CORS · Rate-limit       │
      │  CSRF · Better Auth Session       │
      │                                  │
      │  Routes → Controllers → Services  │
      │                                  │
      │  ┌──────────┐  ┌──────────────┐  │
      │  │encryption│  │  ai.service  │  │
      │  │.service  │  │  (OpenAI)    │  │
      │  └────┬─────┘  └──────┬───────┘  │
      └───────┼───────────────┼──────────┘
              │               │
   ┌──────────▼───┐    ┌──────▼──────────┐
   │  PostgreSQL  │    │  External APIs   │
   │  (AWS RDS)   │    │                  │
   │              │    │  • OpenAI GPT-4  │
   │  AES-256     │    │  • Spotify Web   │
   │  BYTEA cols  │    │  • Resend Email  │
   └──────────────┘    └─────────────────┘
```

---

## Container Layout

The **production Docker image** (see `Dockerfile`) is a multi-stage build:

1. **Stage 1 — `client-build`**: Node + Vite build produces static assets in `client/dist`
2. **Stage 2 — `runtime`**: Node 22 Alpine, installs only server production deps, copies `client/dist` under `STATIC_DIR`

At runtime, Express serves:
- API routes under `/api/*`
- Static SPA assets from `STATIC_DIR`
- SPA fallback (all non-API paths return `index.html`)

```
Port 3000
  ├── /api/*        → Express routers
  ├── /static/**    → Vite build output
  └── /*            → index.html (SPA fallback)
```

---

## Frontend Architecture

### Routing

React Router v6 with two route groups:

| Group | Guard | Pages |
|-------|-------|-------|
| Public | None | Landing, Login, Register, ForgotPassword, ResetPassword, VerifyEmail, WelcomeConsent, Terms, Privacy, Pricing |
| Protected | `AuthContext` redirect | Dashboard, Tasks, Sessions, Chat, Spotify, Settings, Profile |
| Admin | `AuthContext` + `is_admin` | AdminDashboard |

### State Management

Context-based; no Redux. Each context is co-located with the feature it owns:

| Context | Scope |
|---------|-------|
| `AuthContext` | Better Auth session — user object, login/logout, session polling |
| `FocusScoreContext` | Productivity metrics — score, streak, session count |
| `ThemeContext` | Dark / light mode (persisted to localStorage) |
| `ZenModeContext` | Distraction-blocking overlay toggle |
| `SpotifyPlaybackContext` | Spotify Web Playback SDK state |
| `YouTubePlaybackContext` | YouTube IFrame API state |

### CSRF

`client/src/lib/installCsrfFetch.ts` monkey-patches `window.fetch` to:
1. Retrieve the CSRF token from the `csrf-token` cookie on the first mutating request
2. Inject it as the `x-csrf-token` header on every subsequent `POST / PATCH / PUT / DELETE` call

### Music Architecture

`client/src/lib/music-source.ts` is an abstraction layer that routes playback commands to either the Spotify Web Playback SDK or the YouTube IFrame API depending on the user's connected provider. Components interact with `SpotifyPlaybackContext` or `YouTubePlaybackContext`; the music source module handles the dispatch.

---

## Backend Architecture

### Layer Responsibilities

```
Routes         — URL matching, method guard, input validation (express-validator)
Controllers    — Business logic, DB queries via pg pool, encryption/decryption
Services       — External API calls (OpenAI, Spotify, Resend), encryption primitives
Middleware     — Cross-cutting concerns (auth, CSRF, rate-limit, admin gate)
```

### Request Lifecycle

```
Incoming request
  │
  ├─ Helmet (security headers)
  ├─ CORS (origin check)
  ├─ cookie-parser
  ├─ Rate limiter (express-rate-limit)
  ├─ CSRF check (csrf-csrf) — skips /api/auth/* except /api/auth/consent
  │
  ├─ Route match
  │   ├─ auth middleware — Better Auth getSession() → req.user
  │   └─ isAdmin middleware (admin routes only)
  │
  ├─ Controller
  │   ├─ Input validation (express-validator)
  │   ├─ DB query (pg Pool)
  │   ├─ encryption.service decrypt() on read
  │   └─ encryption.service encrypt() on write
  │
  └─ JSON response
```

### Database Connection

`server/config/db.js` creates a single `pg.Pool` instance shared across all controllers. SSL is toggled via `DB_SSL` env var (`false` for local, `true` for RDS). The pool is validated at startup via `startup-check.js` (`SELECT 1`).

---

## Data Model (Key Tables)

```
users (user_id PK)
  │
  ├── account (Better Auth — encrypted_email BYTEA)
  ├── session (Better Auth — active sessions)
  │
  ├── tasks (task_id PK — task_name BYTEA)
  │   └── subtasks (subtask_id PK — subtask_name BYTEA, is_approved BOOL)
  │
  ├── focus_sessions (session_id PK — reflection_content BYTEA)
  │
  ├── chat_sessions (chat_session_id PK)
  │   └── chat_messages (message_id PK — content BYTEA, role, tokens)
  │
  ├── consent_audit_log (immutable — ip, timestamp, consent flags)
  ├── spotify_tokens (access_token BYTEA, refresh_token BYTEA)
  └── openai_usage (model, prompt_tokens, completion_tokens, cost_usd)

system_prompts  — AI persona definitions (deconstructor, prioritizer, etc.)
curated_playlists — Spotify + YouTube playlist metadata
```

All foreign keys have `ON DELETE CASCADE` to support the GDPR right to erasure.

---

## Security Architecture

### Encryption at Rest

```
Controller receives plaintext
  → encryption.service.encrypt(plaintext)
      ├── [Production] AWS KMS GenerateDataKey → AES-256-GCM encrypt → store BYTEA
      └── [Development] AES-256-GCM with ENCRYPTION_KEY env var → store BYTEA
  → pg INSERT (BYTEA column)

pg SELECT (BYTEA column)
  → encryption.service.decrypt(buffer)
  → Controller returns plaintext JSON
```

### Session Security

- HTTP-only `Secure` `SameSite=Lax` cookies — prevents XSS token theft
- No tokens in localStorage or query strings
- Better Auth session rotation on privilege changes

### CORS

`server/config/allowedOrigins.js` builds the allowed origins list from:
- `CLIENT_URL` env var
- `ALLOWED_ORIGINS` env var (comma-separated)

### Rate Limiting

| Scope | Limit |
|-------|-------|
| All API routes | 400 requests per 15 minutes per IP |
| `/api/consent` writes | 30 requests per minute per IP |

### GDPR Data Flow

```
User requests deletion (DELETE /api/users/me/nuke)
  → Password verified with bcrypt
  → DELETE users WHERE user_id = ?  (CASCADE wipes all child rows)
  → Session cookie cleared
  → 204 No Content

User requests export (GET /api/users/me/export)
  → SELECT from users, tasks, subtasks, focus_sessions, chat_*, consent_audit_log
  → Decrypt all BYTEA fields
  → Return single JSON document
```

---

## CI/CD Pipeline

```
Push to main/dev
  │
  ├── dependency-review (PRs only)
  ├── gitleaks (secret scan)
  ├── hadolint (Dockerfile lint)
  ├── codeql (static analysis)
  ├── server-test (Jest)
  ├── client-test (Vitest + ESLint + build)
  └── docker-build → Trivy gate (HIGH/CRITICAL blocks merge)

Tag v* or manual dispatch
  │
  ├── GitHub OIDC → assume AWS role
  ├── Vite build with VITE_API_URL injection
  ├── Trivy gate
  ├── ECR push (:sha7 + :latest)
  └── App Runner start-deployment (if APPRUNNER_SERVICE_ARN set)
```

---

## Observability

| Tool | What it monitors |
|------|-----------------|
| Sentry (`server/instrument.js`) | Unhandled exceptions, slow transactions, request errors |
| `GET /api/health` | Liveness — polled by App Runner health check |
| `GET /api/ready` | Readiness — DB `SELECT 1` gating |
| `openai_usage` table | Per-request token/cost tracking accessible via admin panel |
