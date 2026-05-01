# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in FocusNest, **do not open a public GitHub issue**. Please report it privately:

- **Email**: medamineelhoumiri@gmail.com
- **Subject**: `[SECURITY] <brief description>`

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigations (optional)

You will receive an acknowledgment within **48 hours** and a full response within **7 days**.

We ask that you give us reasonable time to investigate and remediate before any public disclosure. We are committed to working with security researchers in good faith and will credit you in the release notes unless you prefer to remain anonymous.

---

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` (latest) | Yes |
| `dev` | Partially — active development branch |
| Older tags | No |

---

## Security Architecture

### Authentication

- **Session-based auth** via [Better Auth](https://better-auth.com/) — no tokens in localStorage
- Session cookies are `HttpOnly`, `Secure` (production), `SameSite=Lax`
- Email/password with bcrypt hashing (bcrypt v6, cost factor 12)
- OAuth 2.0 via Google and Apple
- Email verification required in production (`REQUIRE_EMAIL_VERIFICATION=true`)

### Encryption at Rest

All Personally Identifiable Information (PII) and sensitive user content is **AES-256-GCM encrypted** before being written to PostgreSQL, stored as `BYTEA` columns:

| Field | Table |
|-------|-------|
| Email address | `account.encrypted_email` |
| Task names | `tasks.task_name` |
| Subtask names | `subtasks.subtask_name` |
| AI chat messages | `chat_messages.content` |
| Session reflection text | `focus_sessions.reflection_content` |
| Spotify OAuth tokens | `spotify_tokens.access_token`, `.refresh_token` |

**Key management:**
- **Production**: AWS KMS Application Layer Encryption — a unique data key is derived per encryption call
- **Development**: Local AES-256-GCM with `ENCRYPTION_KEY` environment variable

### Transport Security

- All production traffic served over HTTPS (AWS App Runner provides TLS termination)
- `Strict-Transport-Security` header enforced by Helmet
- CORS restricted to explicit `ALLOWED_ORIGINS` whitelist

### CSRF Protection

Double-submit cookie pattern via `csrf-csrf`:
- CSRF token injected into a readable `csrf-token` cookie
- Every mutating request (`POST`, `PATCH`, `PUT`, `DELETE`) must include the `x-csrf-token` header
- Client-side `installCsrfFetch.ts` handles this automatically for all `fetch` calls
- Exempt: `/api/auth/*` (Better Auth handles its own session binding), except `/api/auth/consent`

### Rate Limiting

| Scope | Limit |
|-------|-------|
| All API routes | 400 requests per 15 minutes per IP |
| Consent writes (`/api/consent`) | 30 requests per minute per IP |

### Security Headers

Applied globally via [Helmet](https://helmetjs.github.io/):

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 0` (modern browsers; rely on CSP instead)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security` (production)

> **Note:** Content-Security-Policy is intentionally disabled to maintain compatibility with the Vite dev server and OAuth redirect flows. A CSP will be re-enabled in a future release.

### Input Validation

All mutating API endpoints use `express-validator` for input sanitization and validation. Validation errors return `400` with a structured error body before any DB interaction.

### Admin Access

Admin routes (`/api/admin/*`) are gated by the `isAdmin` middleware, which verifies `req.user.is_admin === true` on every request. The flag is set in the database by a server-side script (`scripts/makeAdmin.js`) and cannot be self-assigned via the API.

Usage logs exposed to admins mask the `prompt` and `content` fields to prevent admins from reading individual users' AI conversations.

### GDPR Compliance

| Right | Implementation |
|-------|---------------|
| Right to Erasure (Art. 17) | `DELETE /api/users/me/nuke` — full CASCADE deletion after password confirmation |
| Right to Portability (Art. 20) | `GET /api/users/me/export` — all user data as a single JSON document |
| Consent tracking | `consent_audit_log` — immutable append-only log of all consent changes with IP and timestamp |
| Data minimization | Only necessary fields collected; DOB stored for age verification only |

### CI Security Gates

Every commit to `main` and `dev` runs:

- **Gitleaks** — scans git history for committed secrets
- **Dependency Review** — blocks PRs introducing HIGH-severity CVEs
- **npm audit** — CRITICAL vulnerabilities block the CI job
- **CodeQL** — static analysis for common vulnerability patterns
- **Trivy** — Docker image scan; HIGH/CRITICAL vulnerabilities block the build and deploy

---

## Known Scope Exclusions

- The Cypress E2E tests and Vitest unit tests do not run in CI against a live database — integration-layer security is covered by Jest with mocked DB calls
- The `client/.env` file is committed with minimal non-secret content (Vite proxy config); it intentionally contains no sensitive values
