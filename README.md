# FocusNest

**A neuro-cognitive productivity platform for students with ADHD** — Kanban task management, AI coaching, 5-minute focus sessions, and personalized soundscapes, packaged as a full-stack SaaS application.

[![CI](https://github.com/Amineelhoumiri/FocusNest/actions/workflows/ci.yml/badge.svg)](https://github.com/Amineelhoumiri/FocusNest/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start — Docker](#quick-start--docker)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [CI/CD](#cicd)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## Overview

FocusNest helps students with ADHD stay on task through:

- **Kanban board** — Backlog → Ready → Doing → Done, with a hard limit of one active task at a time
- **5-minute Micro-Timer** — Short focus intervals with a no-shame reflection flow (distraction / low energy / external)
- **AI coaching** — GPT-4-powered chat sessions that deconstruct tasks, prioritize backlog, and provide motivational coaching (Finch personas)
- **Soundscapes** — Spotify OAuth integration and curated YouTube playlists for focus music
- **Zen Mode** — Full distraction-blocking overlay during active sessions
- **GDPR compliance** — Right to erasure, data portability, consent audit trail, encrypted PII at rest

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Backend** | Express 5, Node.js 22 |
| **Database** | PostgreSQL 16 (AWS RDS) |
| **Auth** | Better Auth — session cookies, email verification, OAuth (Google, Apple) |
| **Encryption** | AWS KMS Application Layer Encryption (ALE) — AES-256 for PII at rest |
| **AI** | OpenAI GPT-4 via `openai` SDK |
| **Email** | Resend (transactional — verification, password reset) |
| **Music** | Spotify Web API, YouTube IFrame API |
| **Observability** | Sentry (server-side) |
| **Testing** | Jest (server), Vitest (client), Cypress (E2E) |
| **CI/CD** | GitHub Actions → ECR → AWS App Runner |

---

## Architecture

```
Browser
  │
  ├── React SPA (Vite, port 8080 in dev)
  │     ├── Better Auth client — session cookies
  │     ├── CSRF double-submit protection
  │     └── Relative /api/* calls → proxied to Express
  │
  └── Express API (Node 22, port 3000)
        ├── Middleware: Helmet · CORS · Rate-limit · CSRF · Better Auth session
        ├── Routes → Controllers → Services
        ├── encryption.service.js  — AES-256 encrypt/decrypt (AWS KMS)
        ├── ai.service.js          — OpenAI GPT-4 + token logging
        ├── mail.service.js        — Resend transactional email
        └── config/db.js           — pg Pool → PostgreSQL (AWS RDS, SSL)
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system diagram and data-flow details.



---

## Quick Start — Docker

Runs the full stack (API + SPA) in a single container. Requires only Docker Desktop and a running PostgreSQL instance.

### 1. Configure environment

```bash
cp server/.env.example server/.env
# Edit server/.env — set DB_* credentials at minimum
```

### 2. Start

```bash
docker compose up --build
```

Open `http://localhost:3000`.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Liveness — no DB |
| `GET /api/ready` | Readiness — DB connectivity check |

> **Local Postgres**: `docker-compose.yml` also spins up a Postgres 16 container on port 5433 that you can use by setting `DB_PORT=5433` in `server/.env`.

---

## Local Development

Preferred workflow when actively developing — runs client and server as separate hot-reloading processes.

### Prerequisites

- Node.js 22+
- PostgreSQL 16+ (local or remote)

### Server (port 3000)

```bash
cd server
npm ci
# ensure server/.env is configured
npm run dev
```

### Client (port 8080)

```bash
cd client
npm ci
npm run dev -- --port 8080
```

Vite proxies `/api/*` to `http://127.0.0.1:3000` — no CORS configuration needed in dev.

---

## Environment Variables

Copy `server/.env.example` to `server/.env` and fill in the values. The full reference is in the example file.

### Minimum required (server will not start without these)

| Variable | Description |
|----------|-------------|
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (default `5432`) |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `BETTER_AUTH_SECRET` | Random secret for Better Auth session signing |
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256 at-rest encryption |
| `CLIENT_URL` | Public frontend origin (e.g. `http://localhost:8080`) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |

### Optional integrations

| Variable | Feature |
|----------|---------|
| `OPENAI_API_KEY` | AI coaching (GPT-4) |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Spotify OAuth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth login |
| `RESEND_API_KEY` | Transactional email |
| `SENTRY_DSN` | Error monitoring |
| `KMS_KEY_ID` | AWS KMS key ARN (production encryption) |
| `AWS_REGION` | AWS region for KMS |
| `DB_SSL` | Set `false` to disable TLS for local Postgres |

---

## Testing

### Server — unit + integration (Jest)

```bash
cd server
npm test
```

Tests live in `server/tests/`. A mock Express app and auth helper are in `server/tests/helpers/`.

### Client — unit (Vitest)

```bash
cd client
npm test
```

Test files: `client/src/test/`.

### End-to-end (Cypress)

Requires both server (port 3000) and client (port 8080) running locally.

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev -- --port 8080

# Terminal 3
cd client && npm run cypress:run
```

Cypress specs: `client/cypress/e2e/`.

---

## Project Structure

```
FocusNest/
├── .github/
│   └── workflows/
│       ├── ci.yml           # Tests · security scans · Docker build
│       └── deploy.yml       # ECR push · App Runner deploy
├── client/                  # React/Vite/TypeScript SPA
│   ├── cypress/             # E2E tests
│   │   ├── e2e/
│   │   └── support/
│   ├── public/              # Static assets
│   └── src/
│       ├── components/
│       │   ├── layout/      # AppLayout, AppSidebar, Navbar
│       │   ├── music/       # Spotify + YouTube player components
│       │   ├── legal/       # Terms & Privacy modals
│       │   └── ui/          # shadcn/ui component library
│       ├── context/         # AuthContext · FocusScoreContext · ThemeContext · ZenModeContext
│       ├── hooks/           # use-mobile · use-toast · useSpotifyPlayer · useYouTubePlayer
│       ├── lib/             # auth-client · installCsrfFetch · music-source · utils
│       ├── pages/           # Route-level page components
│       │   └── admin/
│       └── test/            # Vitest unit tests
├── database/
│   ├── schema/
│   │   └── focusnest_db.sql # Canonical database schema
│   ├── queries/             # Reference SQL queries
│   └── seed/
│       └── create_test_user.sql
├── docs/
│   ├── ARCHITECTURE.md      # System design and data-flow
│   ├── DEPLOYMENT.md        # AWS App Runner + RDS deployment guide
│   ├── SECURITY.md          # Security policy and vulnerability reporting
│   ├── BACKEND_DOCUMENTATION.md
│   ├── swagger.yaml         # OpenAPI 3.0 spec
│   └── token_costs.json
├── server/                  # Express/Node.js API
│   ├── config/
│   │   ├── db.js            # PostgreSQL pool
│   │   └── allowedOrigins.js
│   ├── controllers/         # Business logic layer
│   ├── middleware/          # auth · isAdmin · rate-limit · csrf
│   ├── routes/              # Express router definitions
│   ├── scripts/
│   │   ├── migrations/      # SQL schema migrations
│   │   ├── makeAdmin.js
│   │   ├── purgeInactiveUsers.js
│   │   └── seedAiPrompts.js
│   ├── services/            # ai · encryption · mail · spotify · token
│   ├── tests/               # Jest tests + helpers
│   ├── auth.js              # Better Auth configuration
│   ├── index.js             # Express entry point
│   └── .env.example         # Environment variable reference
├── Dockerfile               # Multi-stage: Vite build → Node runtime
├── docker-compose.yml       # Local dev: app + Postgres 16
├── DEPLOYMENT.md            # AWS App Runner + RDS deployment guide
├── CONTRIBUTING.md          # Contribution guidelines
├── SECURITY.md              # Security policy and vulnerability reporting
└── LICENSE
```

---

## CI/CD

### Continuous Integration (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main` and `dev`.

| Job | What it does |
|-----|-------------|
| `dependency-review` | Blocks PRs with HIGH-severity dependency CVEs |
| `gitleaks` | Scans git history for committed secrets |
| `hadolint` | Lints the Dockerfile |
| `codeql` | Static analysis (JavaScript / TypeScript) |
| `server-test` | `npm ci` → Jest → npm audit |
| `client-test` | `npm ci` → Vite build → Vitest → ESLint → npm audit |
| `docker-build` | Multi-stage build → Trivy scan (fails on HIGH/CRITICAL) |

### Continuous Deployment (`.github/workflows/deploy.yml`)

Triggered by a version tag (`v*`) or manual workflow dispatch.

1. Authenticates to AWS via **GitHub OIDC** (no long-lived keys)
2. Builds the Docker image with `VITE_API_URL` and optional `VITE_POSTHOG_*` / `VITE_SENTRY_DSN` from GitHub secrets
3. Runs Trivy as a gate — aborts on HIGH/CRITICAL vulnerabilities
4. Pushes two tags to ECR: `<sha7>` and `latest`
5. Triggers an App Runner deployment (if `APPRUNNER_SERVICE_ARN` secret is set)

---

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the complete AWS App Runner + RDS deployment guide, including:

- ECR repository setup
- VPC connector and security group configuration
- App Runner service creation
- GitHub Actions secrets and IAM permissions
- OAuth provider configuration for production

---

## Contributing

Fork the repo, create a feature branch off `dev`, and open a pull request against `dev`. Keep commits small and focused. The CI pipeline (tests + lint + security scans) must pass before merge.

---

## Security

Vulnerability reports: see [`docs/SECURITY.md`](docs/SECURITY.md).

Key security properties at a glance:

- **Encryption at rest** — emails, task names, chat messages, and Spotify tokens are AES-256 encrypted before DB storage (BYTEA), keyed via AWS KMS in production
- **CSRF** — double-submit cookie pattern (`csrf-csrf`) on all mutating endpoints
- **Session auth** — HTTP-only secure cookies via Better Auth; no tokens in localStorage
- **Rate limiting** — 400 req / 15 min per IP on the API; 30 req / min on consent writes
- **GDPR** — Right to Erasure (`DELETE /api/users/me/nuke`), Right to Portability (`GET /api/users/me/export`), immutable consent audit log

---

## License

[MIT](LICENSE) — Copyright 2026 Amine El Houmiri
