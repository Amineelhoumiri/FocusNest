# FocusNest — MVP Requirements & Feature Specification

> **For Claude Code:** This document defines the full MVP scope for FocusNest. Use this as the source of truth when building, testing, and validating features. Each section includes acceptance criteria and implementation notes.

---

## Project Overview

**FocusNest** is a full-stack web application designed as a "Neuro-Cognitive Scaffold" for users with ADHD and executive dysfunction. It enforces single-tasking, reduces cognitive load, and provides temporal anchoring to help users initiate and sustain focus.

- **Stack:** React + Tailwind CSS (Frontend) · Node.js + Express (Backend) · PostgreSQL on Amazon RDS (Database)
- **Infrastructure:** AWS App Runner / ECS · AWS KMS · Docker · GitHub Actions CI/CD
- **External APIs:** OpenAI API · Spotify Web Playback SDK
- **Observability:** Sentry · ContentSquare

---

## Build Order (Sequential — Do Not Skip Ahead)

```
1. Database schema + backend scaffolding
2. Auth flow (register → consent modal → JWT)
3. Kanban board + single-task enforcement
4. Focus session engine (micro-timer, Web Worker, Done-By calculator)
5. OpenAI task decomposition
6. "I'm Stuck" flow + No-Shame Reset
7. Spotify SDK integration
8. Admin dashboard
9. Sentry + ContentSquare instrumentation
10. Data Nuke + JSON export
```

---

## 1. Database Schema

### Requirements
- All primary keys **must** use `UUIDv4` — no sequential integers
- All foreign keys linking to `users` table **must** have `ON DELETE CASCADE`
- Encryption at rest via AWS RDS AES-256
- Key management via AWS KMS (FIPS 140-3 Level 3 HSMs)

### Tables

| Table | Key Fields |
|---|---|
| `users` | `user_id UUID PK`, `full_name`, `email`, `is_admin BOOLEAN`, `last_login`, `is_consented_core`, `is_consented_ai`, `is_consented_spotify` |
| `accounts` | `account_id UUID PK`, `user_id UUID FK`, `email encrypted_blob`, `password password_blob`, `is_active` |
| `tasks` | `task_id UUID PK`, `user_id UUID FK`, `task_name encrypted_blob`, `status ENUM(Backlog,Ready,Doing,Done)`, `energy_level ENUM(High,Low)` |
| `subtasks` | `subtask_id UUID PK`, `task_id UUID FK`, `subtask_name encrypted_blob`, `status`, `energy_level`, `is_approved BOOLEAN` |
| `sessions` | `session_id UUID PK`, `user_id UUID FK`, `task_id UUID FK`, `start_time`, `end_time`, `is_active`, `distraction_count INT`, `reflection_type`, `reflection_content encrypted_blob`, `outcome` |
| `chat_sessions` | `chat_session_id UUID PK`, `user_id UUID FK`, `created_at`, `ended_at` |
| `chat_messages` | `chat_message_id UUID PK`, `chat_session_id UUID FK`, `role ENUM(user,assistant)`, `content encrypted_blob`, `token_count INT` |
| `openai_usage` | `id UUID PK`, `user_id UUID FK`, `chat_session_id UUID FK`, `model`, `prompt_tokens INT`, `completion_tokens INT`, `total_tokens INT`, `cost_usd DECIMAL`, `request_ip_hashed` |
| `system_prompts` | `key VARCHAR PK`, `prompt TEXT` |
| `spotify_accounts` | `spotify_acc_id UUID PK`, `user_id UUID FK`, `spotify_user_id encrypted_blob`, `access_token encrypted_blob`, `refresh_token encrypted_blob`, `expires_at`, `scopes` |
| `consent_audit_log` | `consent_audit_id UUID PK`, `user_id UUID FK`, `consented_at TIMESTAMP`, `policy_version`, `consent_type ENUM(core,ai,spotify)`, `consent_value BOOLEAN` |

### Acceptance Criteria
- [ ] All PKs are UUID, confirmed via schema inspection
- [ ] `DROP users WHERE id = X` cascades to all linked tables — verify with test
- [ ] No raw PII stored as plaintext in any column
- [ ] Migrations tracked and versioned

---

## 2. Authentication Flow

### Register
1. User submits email + password
2. Backend validates, hashes password with `bcrypt` (min rounds: 12)
3. **Consent Modal** displayed — three separate non-pre-checked toggles:
   - ✅ Core Data (Required) — task/timer storage
   - ☐ AI Processing (Optional) — sending text to OpenAI
   - ☐ Spotify Integration (Optional) — audio SDK
4. Consent choices written to `consent_audit_log`
5. JWT generated (signed with env secret), stored in `HttpOnly` cookie
6. Redirect to `/dashboard`

### Login
1. `POST /api/auth/login` with `{ email, password }`
2. Backend queries `users` by email
3. `bcrypt.compare(password, hashedPassword)`
4. On success: generate JWT `{ userId, role, exp }` → `HttpOnly` cookie
5. Frontend state → Authenticated → redirect to `/dashboard`

### Acceptance Criteria
- [ ] JWT never exposed in `localStorage` or URL params
- [ ] Consent modal cannot be submitted without checking "Core Data"
- [ ] All consent events logged to `consent_audit_log` with timestamp + policy version
- [ ] bcrypt rounds ≥ 12
- [ ] Invalid credentials return generic error (no user enumeration)

---

## 3. Kanban Board

### Rules
- **Four fixed columns only:** `Backlog → Ready → Doing → Done`
- **Hard single-task constraint:** Max **1 task** in `Doing` at any time
- Attempting to drag a second task to `Doing` must be blocked with a UI message: *"Finish or move your current task first."*
- Starting a timer automatically moves a task to `Doing`
- Completing a session moves task to `Done`

### AI Task Breakdown (FR-C-03)
1. User clicks "Breakdown with AI" on any task
2. `POST /api/tasks/generate-breakdown` → OpenAI API
3. OpenAI returns `JSON array` of subtasks
4. Frontend displays subtasks for **user review and confirmation**
5. User clicks "Confirm" → `POST /api/tasks` → application-level encryption → INSERT to DB
6. Subtasks appear on Kanban board under parent task

> **Note:** AI breakdown only fires if `is_consented_ai = true`. If not, prompt user to enable AI in settings.

### Acceptance Criteria
- [ ] Cannot have 2 tasks in `Doing` — test by attempting drag and API call
- [ ] AI breakdown returns structured subtask array, not freeform text
- [ ] Subtasks require explicit user confirmation before DB write
- [ ] All task names stored as `encrypted_blob` in DB

---

## 4. Focus Session Engine

### Session Start (FR-C-04)
- All sessions begin with a **5-minute Micro-Timer** (the "Five-Minute Rule")
- Timer runs in a **Web Worker** — decoupled from main UI thread
- Starting a session moves the task to `Doing` column

### Timer Display (FR-C-06 — Time Blindness Tools)
- Show both:
  - Visual analogue ring/progress indicator (not just digits)
  - **Done-By Calculator:** `"Finishes at 2:45 PM"` — calculated from `now + remaining`
- No abstract countdown alone

### On Timer Expiry
- Display modal with exactly three options:
  1. "Continue working" → restart timer
  2. "Take a break" → pause session
  3. "Switch task" → triggers Activity Switching flow
- **Do not auto-advance** — user must choose

### No-Shame Reset (FR-C-08)
- If user cancels timer mid-session:
  - No red UI
  - No failure sounds or animations
  - Display reflection prompt: *"What got in the way?"*
  - Options: `Distraction` | `Low Energy` | `Something Else`
  - Log `reflection_type` and `reflection_content` to `sessions` table

### Acceptance Criteria
- [ ] Web Worker timer does not drift when UI is under load — test with CPU stress
- [ ] Done-By Calculator updates in real time as timer runs
- [ ] Cancel flow shows reflection prompt, never a failure state
- [ ] Reflection data written to `sessions` table correctly

---

## 5. "I'm Stuck" — Activity Switching (FR-C-05)

### Flow
1. User clicks "I'm Stuck" button (always visible during active session)
2. System **pauses** current `High-Energy` task (does not stop session timer)
3. System **pulls the first available `Low-Energy` task** from Backlog
4. Swaps it into the session view immediately
5. Session clock continues running uninterrupted
6. On completion or resume, original `High-Energy` task returns to `Ready`

### Acceptance Criteria
- [ ] Session timer does not reset or stop during activity switch
- [ ] Low-energy task sourced from `tasks WHERE energy_level = 'Low' AND status = 'Backlog'`
- [ ] If no low-energy tasks exist, display: *"Add a low-energy task to your backlog first"*
- [ ] Switch event logged to `sessions` table

---

## 6. 40Hz Audio Engine (FR-C-07)

### Integration
- Spotify Web Playback SDK
- Two modes:
  - **40Hz Binaural Beats** (Focus mode)
  - **Brown Noise** (Masking mode)
- UI restricted to **Play / Pause toggle only** — no volume slider, no track info, no shuffle
- Only available if `is_consented_spotify = true`

### Acceptance Criteria
- [ ] No Spotify UI chrome beyond play/pause
- [ ] SDK initialises only after Spotify consent confirmed
- [ ] Playback state persists across session timer resets

---

## 7. API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT in HttpOnly cookie |
| POST | `/api/auth/logout` | Clear session cookie |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | Get all tasks for authenticated user |
| POST | `/api/tasks` | Create new task |
| PATCH | `/api/tasks/:id` | Update task (status, energy level, name) |
| DELETE | `/api/tasks/:id` | Delete single task |
| POST | `/api/tasks/generate-breakdown` | AI subtask decomposition |

### Sessions
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/sessions/start` | Start session (Concurrency Guard: 409 if session active) |
| PATCH | `/api/sessions/:id/end` | End session |
| PATCH | `/api/sessions/:id/switch` | Activity switch (I'm Stuck) |
| POST | `/api/sessions/:id/reflect` | Log reflection after cancel |

### User / GDPR
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/user/me` | Get current user profile |
| GET | `/api/user/export` | Download all user data as JSON |
| DELETE | `/api/user/me` | Data Nuke — cascade delete all user data |

### Admin (Auth: `is_admin = true`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/usage` | OpenAI token usage stats per user |
| GET | `/api/admin/users` | User list with masked task content |
| GET | `/api/system-prompts` | List all system prompts |
| PUT | `/api/system-prompts/:key` | Update system prompt (no redeploy) |

### OpenAPI
- All endpoints documented via **Swagger / OpenAPI Specification v3.0**
- Swagger UI available at `/api/docs` in development

### `/sessions/start` Contract
```yaml
POST /sessions/start:
  summary: Start 5-minute Micro-Timer session
  description: >
    One active session per user enforced.
    Returns 409 Conflict if session already active.
  requestBody:
    required: true
    content:
      application/json:
        schema:
          type: object
          required: [task_id]
          properties:
            task_id:
              type: string
              format: uuid
  responses:
    '201': Session started
    '400': Invalid task_id
    '409': Session already active
```

---

## 8. GDPR Compliance

### Data Nuke (FR-L-01)
- Button location: `Settings → Danger Zone → "Delete Account & Wipe All Data"`
- Two-step confirmation required (type "DELETE" to confirm)
- Triggers: `DELETE FROM users WHERE user_id = ?` with CASCADE
- Returns `204 No Content`
- Frontend redirects to `/account-deleted`

### JSON Export (FR-L-02)
- `GET /api/user/export`
- Returns structured JSON containing:
  - User profile
  - All tasks + subtasks
  - All session records
  - Reflection logs
  - Chat history

### Consent Modal (FR-L-03)
- Shown on registration only
- Three toggles — **none pre-checked**
- Core is required to proceed
- All selections written to `consent_audit_log`

### Acceptance Criteria
- [ ] Data Nuke verified: after DELETE, query all related tables — must return 0 rows
- [ ] JSON export contains no encrypted blobs — must be decrypted before export
- [ ] Consent modal cannot be bypassed

---

## 9. Admin Dashboard

### Features
- **Token Usage Chart:** OpenAI tokens per user over time (line/bar chart)
- **User Table:** Shows `user_id`, `last_login`, `task_count`, `session_count`
- **Masked Content:** Task names and chat messages display as `*******`
- **System Prompt Editor:** CRUD interface for `system_prompts` table

### Acceptance Criteria
- [ ] Admin routes return `403` for non-admin users
- [ ] Task content never exposed in admin view
- [ ] Prompt updates take effect on next AI call without redeployment

---

## 10. Observability

### Sentry
- Integrated in both React (frontend) and Node.js (backend)
- Captures: unhandled exceptions, API errors, slow transactions
- Alert threshold: any `5xx` error triggers immediate notification

### ContentSquare
- Tracks: rage clicks, navigation loops, zone recurrence
- Primary target: "I'm Stuck" button discoverability

### Acceptance Criteria
- [ ] Sentry DSN configured via environment variable (not hardcoded)
- [ ] Test Sentry by triggering a deliberate `throw new Error('sentry-test')`
- [ ] ContentSquare script loaded asynchronously (must not block render)

---

## 11. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Session timer accuracy | ±0ms drift (Web Worker) |
| API response time (p95) | < 300ms |
| Zen Mode render | No navigation, no backlog visible |
| HTTPS | TLS 1.2 minimum (AWS ACM) |
| Cookie security | `HttpOnly`, `Secure`, `SameSite=Strict` |
| DB keys | UUIDv4 only |
| Password hashing | bcrypt, ≥ 12 rounds |
| Data at rest | AES-256 (AWS RDS) |
| Data in transit | TLS 1.2+ |
| 90-day idle purge | AWS Lambda scheduled function |

---

## 12. Environment Variables Required

```env
# Database
DATABASE_URL=

# Auth
JWT_SECRET=
JWT_EXPIRES_IN=7d

# AWS
AWS_REGION=
AWS_KMS_KEY_ID=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# OpenAI
OPENAI_API_KEY=

# Spotify
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=

# Observability
SENTRY_DSN=
CONTENTSQUARE_SITE_ID=

# App
NODE_ENV=
PORT=3001
FRONTEND_URL=
```

---

## 13. Testing Checklist (Claude Code — Run These)

### Unit Tests
- [ ] `bcrypt.compare` returns `false` for wrong password
- [ ] UUID generation produces valid v4 format
- [ ] Done-By Calculator returns correct time given duration input
- [ ] AI breakdown endpoint returns array, not string

### Integration Tests
- [ ] `POST /sessions/start` returns `409` when session already active
- [ ] `DELETE /user/me` cascades — verify 0 rows across all related tables
- [ ] Kanban rejects second task drag to `Doing`
- [ ] Consent modal blocks registration if Core toggle is off

### Security Tests
- [ ] JWT in `HttpOnly` cookie — inaccessible via `document.cookie`
- [ ] Admin endpoint returns `403` for regular user JWT
- [ ] SQL injection attempt on task name field → no DB error
- [ ] No plaintext PII in any DB column

---

*Last updated: April 2026 | Version: MVP 1.0 | Supervisor: Dr Anthony Skip Basiel*