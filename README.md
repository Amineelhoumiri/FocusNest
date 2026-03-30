# FocusNest
A SaaS-ready Productivity Management System designed for students. Features intelligent resource nesting, distraction blocking, and focus analytics. Built with a dual-role architecture (Admin/Customer) as a 3rd-year Software engineering Dissertation project.

## Quick start (Docker — runs the whole app)

This repo supports running **API + SPA in one container** (recommended for simplest local run).

### Prerequisites
- **Docker Desktop**
- A PostgreSQL database (local Postgres or AWS RDS)

### 1) Configure environment
Create `server/.env` with your database and auth secrets.

Minimum required for the server to start:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

Common local settings:
- `DB_SSL=false` (disable SSL for local Postgres)
- `CLIENT_URL=http://localhost:3000`
- `ALLOWED_ORIGINS=http://localhost:3000`

### 2) Run
Build and start:

```bash
docker compose up --build
```

Open `http://localhost:3000`.

### Useful endpoints
- **Health**: `GET /api/health` (liveness) and `GET /api/ready` (database readiness check).

---

## Local dev (separate client + server)

### Prerequisites
- Node.js (project uses Node 22 in CI)
- PostgreSQL database

### 1) Server (port 3000)

```bash
cd server
npm ci
# ensure server/.env exists
npm run dev
```

Server listens on `http://localhost:3000`.

### 2) Client (run on port 8080 for Cypress)

```bash
cd client
npm ci
npm run dev -- --port 8080
```

Client dev server: `http://localhost:8080`

---

## Tests

### Server unit/integration (Jest)

```bash
cd server
npm test
```

### Client unit (Vitest)

```bash
cd client
npm test
```

### Cypress E2E
Cypress expects:
- Client at `http://localhost:8080`
- Server at `http://localhost:3000`

In one terminal, run server. In a second terminal, run client on `8080`, then:

```bash
cd client
npm run cypress:run
```

---

## CI/CD overview

- **CI**: `.github/workflows/ci.yml` runs server tests, client build/tests, and security scans (CodeQL/Trivy/etc).
- **Deploy**: `.github/workflows/deploy.yml` builds and pushes the Docker image to **ECR** and (optionally) triggers an **App Runner** deployment.

More details: see `DEPLOYMENT.md`.

## Deploy to AWS (step by step — App Runner + RDS)

Assume **RDS PostgreSQL** is already running (private), with security group allowing the App Runner **VPC connector** SG on port **5432**.

### Step 1 — ECR

1. In **ECR**, create a repository (e.g. `focusnest`).
2. Note account ID and region for the image URI.

### Step 2 — VPC connector (reach RDS from App Runner)

1. In **App Runner** → **VPC connectors** → Create.
2. Pick **subnets** that can route to RDS (same VPC; usually private subnets).
3. Attach a **security group** for the connector (e.g. `apprunner-connector-sg`).
4. On the **RDS** security group, allow **inbound 5432** from `apprunner-connector-sg` (not from the public internet).

### Step 3 — App Runner service

1. **App Runner** → **Create service** → **Container registry** → **Amazon ECR**.
2. **Image**: your repo; deployment trigger **on every push** to `:latest` *or* leave manual and use GitHub Actions `start-deployment` only.
3. **Port**: `3000`.
4. **Health check** (optional but recommended): HTTP path `/api/health`.
5. Under **Networking**, attach the **VPC connector** from step 2.
6. **Environment variables** (minimum; align with `server/.env`):

   | Variable | Purpose |
   |----------|---------|
   | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | RDS ([`server/config/db.js`](server/config/db.js)) |
   | `CLIENT_URL` | Public `https://…` origin (no trailing slash) |
   | `ALLOWED_ORIGINS` | Same origin (and any extra frontends), comma-separated |
   | `DB_SSL` | Omit or `true` for RDS TLS; `false` only if you intentionally disable SSL |

   Add **Secrets Manager** references for passwords and API keys (Google/Apple OAuth, Spotify, AI, Sentry, encryption keys, Better Auth secret, etc.).

7. **Instance role** (if the app calls AWS APIs e.g. KMS): attach an IAM role with least privilege.

8. After create, copy the service **ARN** (for GitHub) and the **default URL** (for `PUBLIC_APP_URL` / OAuth).

### Step 4 — GitHub repository

1. **Settings → Secrets and variables → Actions**
   - Secrets: `AWS_ROLE_ARN`, `AWS_REGION`, `ECR_REPOSITORY`, optional `APPRUNNER_SERVICE_ARN`.
   - Variables: `PUBLIC_APP_URL` = your live `https://…` (same host users open in the browser).

2. Update the **IAM OIDC role** used by GitHub: remove ECS permissions; allow **ECR push** and **`apprunner:StartDeployment`**, **`apprunner:DescribeService`**, **`apprunner:ListOperations`** on the App Runner service (or `*` on `apprunner` for a small project).

### Step 5 — OAuth / providers

1. In Google Cloud / Apple developer consoles, set redirect and JavaScript origins to your **production** `https://` URL.

### Step 6 — Deploy

1. Tag and push: `git tag v0.1.0 && git push origin v0.1.0`, or run **Actions → Deploy → Run workflow**.
2. Confirm **App Runner** shows a successful deployment; hit `/api/health` and `/api/ready` on the public URL.
