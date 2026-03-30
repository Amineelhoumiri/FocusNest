# FocusNest — Deployment & DevOps Documentation

This document captures what we set up in this repo for **containerization (Docker)**, **CI security + testing**, and **AWS deployment** using **ECR + App Runner + RDS**. It also documents the remaining steps to finish the deployment end-to-end.

---

## 1) Docker (containerizing the app)

### What’s implemented
- The repository builds and runs as **one production container** that includes:
  - **Vite/React client** built into static assets (`client/dist`)
  - **Node/Express server** serving:
    - API routes under `/api/*`
    - the SPA static assets with an SPA fallback

### Key files
- `Dockerfile`
  - Multi-stage build:
    - `client-build`: installs client deps → builds Vite app with `VITE_API_URL` build arg
    - `runtime`: installs server production deps, copies server and built client assets
  - Runs as **non-root**
  - Uses `dumb-init` as PID1
  - Exposes **port 3000**
  - Sets `STATIC_DIR=/app/client/dist` so the server can serve the SPA

- `docker-compose.yml`
  - Runs the app locally on `http://localhost:3000`
  - Loads environment variables from `server/.env`

### Server behavior in Docker / production
- `server/index.js`
  - Health endpoints:
    - `GET /api/health` (liveness; no DB access)
    - `GET /api/ready` (readiness; DB check via `SELECT 1`)
  - CORS:
    - Configured from `ALLOWED_ORIGINS` (comma-separated) and `CLIENT_URL`
  - Static SPA:
    - Serves the SPA from `STATIC_DIR` when it exists
    - SPA fallback for non-`/api` paths

### Database connection expectations
- `server/config/db.js`
  - Required env vars:
    - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
  - SSL behavior:
    - `DB_SSL=false` disables SSL (common for local)
    - otherwise SSL is enabled (typical for RDS)

---

## 2) CI (tests + security checks)

### What CI does
CI runs on push and pull requests to `main` and `dev`:
- **Server**: install → Jest tests → npm audit checks
- **Client**: install → production build → Vitest → ESLint → npm audit checks
- **Docker**: build image → scan image vulnerabilities
- **Security tooling**:
  - Dependency review (PR-only)
  - Secret scanning (Gitleaks)
  - Dockerfile lint (Hadolint)
  - Static analysis (CodeQL)
  - Image scanning (Trivy), including a gating step

### Key file
- `.github/workflows/ci.yml`

Notes:
- ESLint may be configured as non-blocking depending on the workflow settings.
- Trivy may fail builds if base image vulnerabilities exceed the gating threshold (HIGH/CRITICAL).

---

## 3) CI/CD Deployment (AWS: ECR + App Runner)

### Overview
- **ECR (Elastic Container Registry)** stores built Docker images.
- **App Runner** runs the container and provides an HTTPS public URL.
- **RDS** hosts PostgreSQL securely inside your VPC.

### Deployment workflow
- `.github/workflows/deploy.yml`
  - Uses **GitHub OIDC** to assume an AWS role (no long-lived AWS keys)
  - Logs into ECR and pushes two tags:
    - `${GITHUB_SHA::7}`
    - `latest`
  - Builds the client with:
    - `VITE_API_URL=${{ vars.PUBLIC_APP_URL }}`
  - If `APPRUNNER_SERVICE_ARN` is set, it triggers:
    - `aws apprunner start-deployment --service-arn ...`
  - If `APPRUNNER_SERVICE_ARN` is not set:
    - It pushes to ECR only (use App Runner automatic deploy on `:latest` if enabled)

### GitHub configuration (expected)
- GitHub **Secrets**:
  - `AWS_ROLE_ARN`
  - `AWS_REGION`
  - `ECR_REPOSITORY`
  - optional: `APPRUNNER_SERVICE_ARN`
- GitHub **Variables**:
  - `PUBLIC_APP_URL` (public HTTPS origin of your App Runner service / custom domain)

### IAM permissions (high level)
The GitHub OIDC role needs, at minimum:
- ECR push permissions for your repository
- If using explicit deployment trigger: `apprunner:StartDeployment` (and typically `DescribeService`, `ListOperations`) on the App Runner service

---

## 4) Kubernetes (K8s) status

Kubernetes manifests were **not** added as part of this work. The repo is set up for **container-first** deployment and the chosen “easy scalable” path is **App Runner**.

If you later choose Kubernetes (EKS), you would add:
- Deployments/Services/Ingress manifests (or Helm)
- Secrets integration (e.g., External Secrets)
- Networking / security group access from pods to RDS
- A separate CI/CD workflow targeting EKS

---

## 5) AWS networking + database configuration (what we configured)

### RDS
- Database: `focusnest-db` (PostgreSQL)
- VPC: `vpc-093feae32b4629e71`

### Subnets (for the App Runner VPC connector)
Use any **two** in different AZs, for example:
- `subnet-013072d14b50c55c9` (eu-west-2c)
- `subnet-083b140a18203c2b7` (eu-west-2b)

### Security groups (important)
- App Runner connector SG:
  - `apprunner-connector-sg` = `sg-0e58bc95632a582bf`
- RDS SG:
  - `focusnest-rds-sg` = `sg-027814d23594eaec2`
- RDS inbound hardening:
  - Removed `0.0.0.0/0`
  - Allowed inbound PostgreSQL **5432** from `sg-0e58bc95632a582bf`

---

## 6) What’s left to finish end-to-end

1) **Create App Runner VPC connector**
- VPC: `vpc-093feae32b4629e71`
- Subnets: two AZs (e.g. `subnet-013072d14b50c55c9` + `subnet-083b140a18203c2b7`)
- Security group: `sg-0e58bc95632a582bf`

2) **Create App Runner service**
- Source: ECR image
- Port: `3000`
- Attach VPC connector (so it can reach RDS)
- Health check: `/api/health`
- Set environment variables/secrets for:
  - DB (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, optional `DB_SSL`)
  - CORS + redirects (`CLIENT_URL`, `ALLOWED_ORIGINS`)
  - OAuth / Spotify / AI / Sentry / encryption secrets (as used by the server)

3) **Ensure ECR has an image**
- Run the Deploy workflow (or push an image manually) so App Runner can pull `:latest`

4) **Finalize GitHub Actions secrets/vars + IAM**
- Set secrets/vars above
- Ensure the OIDC role permissions match ECR + App Runner usage

5) **OAuth provider production config**
- Add production HTTPS URL to Google/Apple redirect URIs + allowed origins

6) **Verify**
- `https://<app-runner-url>/api/health`
- `https://<app-runner-url>/api/ready`
- Login + a DB-backed flow works

