# FocusNest Backend API Documentation

Welcome to the FocusNest backend documentation! This robust backend is engineered with Express.js and PostgreSQL, focusing aggressively on data security, high stability, and specialised logic for productivity and focus-tracking.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Security & Encryption](#security--encryption)
3. [Modules & Controllers](#modules--controllers)
    - [Authentication (`auth.controller.js`)](#authentication)
    - [User Management (`users.controller.js`)](#user-management)
    - [Tasks & Subtasks](#tasks--subtasks)
    - [Focus Sessions (`sessions.controller.js`)](#focus-sessions)
    - [AI Chat Assistants (`chat.controller.js`)](#ai-chat)
    - [GDPR & Consent Logging (`consent.controller.js`)](#gdpr--consent-logging)
    - [Admin Operations (`admin.controller.js`)](#admin)

---

## Architecture Overview

The backend uses a standard RESTful architecture wrapped with Express middleware.

- **Routing Layer**: `server/routes/...`
- **Business Logic Layer**: `server/controllers/...`
- **Data Access Layer**: Postgres connection mapping via `server/config/db.js`
- **Services Layer**: JWT handling & AES encryption located in `server/services/...`

---

## Security & Encryption

A core pillar of FocusNest is data privacy. Sensitive Personally Identifiable Information (PII) like `email`, as well as potentially sensitive planning elements like `task_name`, `subtask_name`, and AI `chat_messages`, are **all encrypted at rest** in PostgreSQL as `BYTEA` using AES-256 standard encryption via our internal `encryption.service.js`.

- Our controllers automatically `decrypt()` names specifically right before turning data objects back into JSON for the frontend requesting them. 
- All standard endpoints are guarded by JWT (JSON Web Token) based `auth` middleware, with specific high-level routes guarded by an additional `isAdmin` middleware gate. Tokens are stored securely as HTTP-only secure cookies protecting against standard cross-site scripting (XSS) attacks.

---

## Modules & Controllers

The backend logic is modularised across specialised controllers found inside `server/controllers`. Every single function inside these files features comprehensive JSDoc annotations to aid future development via intellisense in your IDE.

### Authentication
**File**: `auth.controller.js`
Handles the onboarding pipelines and token generation.
- **`POST /api/auth/register`**: Validates required elements (like `date_of_birth`), hashes passwords using bcrypt, securely encrypts the email as `BYTEA` so plaintext emails never touch the Postgres Tables, generates tokens, and sets HTTP-only cookies.
- **`POST /api/auth/login`**: Dynamically loops to decrypt emails, matching inputs against credentials returning active status, and establishing user cookies.
- **`POST /api/auth/refresh`**: Silent background capability to verify `refresh_token` HTTP boundaries and return fresh JWT access tokens avoiding session disruptions.
- **`POST /api/auth/logout`**: Tears out the database `is_revoked` token flag and clears frontend cookies.

### User Management
**File**: `users.controller.js`
Centred heavily on GDPR compliance capabilities for the authorised user.
- **`GET /api/users/me`**: Fetches the authenticated user profile, dynamically ripping and decrypting their associated email address from the adjacent `account` SQL table.  
- **`PATCH /api/users/me`**: Smart partial updates using a dynamic `$index` array algorithm allowing metadata patching.
- **`GET /api/users/me/export`**: Resolves GDPR Right To Portability by scraping their metadata across all related tables (tasks, chats, sessions, logs) formatting them into single, downloadable JSON document objects.  
- **`DELETE /api/users/me/nuke`**: Aggressively secure CASCADE erasure tearing down all components inside the SQL tables after verifying a final password prompt.

### Tasks & Subtasks
**Files**: `tasks.controller.js`, `subtasks.controller.js`
FocusNest follows a strict Kanban implementation for flow state optimisation. 
- You may only ever have **one** singular task flagged as 'Doing' at a given time natively preventing multitasking. This restriction scales down directly to `subtasks` under active parent tasks. 
- When an AI (or user) creates subtasks, they land with `is_approved = FALSE`. The user must manually `PATCH` them with true to promote them conceptually onto their active focus board. 

### Focus Sessions
**File**: `sessions.controller.js`
Timer backend tracking intervals.  
- **`POST /api/sessions`**: Bootstraps an `is_active = TRUE` time log for a specific `task_id`. 
- **`POST /api/sessions/:session_id/switch`**: Highly specialised endpoint allowing a user to change the overarching `task_id` associated with a timer without actually stopping their background clock. 
- **`PATCH /api/sessions/:session_id`**: Flips the current session to inactive, locking the `CURRENT_TIMESTAMP` as its end boundary while injecting post-focus reflection datasets (like perceived outcome or distraction levels).

### AI Chat
**File**: `chat.controller.js`
A stateless pipeline for LLM implementations ensuring conversational threading.
- Initialises threads (`POST /api/chat`) and allows message insertion representing `assistant`, `system`, or `user` roles tracking their token densities.
- Fetches full chat history using an ascendant SQL order, returning perfectly formatted contextual context for an LLM implementation pipeline to absorb and utilise dynamically.

### GDPR & Consent Logging
**File**: `consent.controller.js`
Handles explicit Opt-In behaviours specifically for 3rd party integrations (OpenAI or Spotify features).
- **`PATCH /api/consent`**: Secured underneath a Postgres Database Transaction block (`BEGIN`/`COMMIT`/`ROLLBACK`). The system automatically captures the request's originating `ip_address` alongside standard updates, inserting a permanent snapshot directly into the immutable `consent_audit_log` resolving explicit privacy pipeline validations required under strict European GDPR tracking laws. 

### Admin Operations
**File**: `admin.controller.js`
Backend infrastructure solely accessed by the `is_admin = TRUE` scope.
- Dynamically retrieves user tokens/billing constraints logged over LLM usage (while aggressively masking `prompt` and `content` fields to obscure data preventing prying from internal bad actors).
- Interfaces with the `system_prompts` database, acting as the live command and control centre for altering underlying model characteristics without hardcoding prompts inside standard app builds.
