# FocusNest
A SaaS-ready Productivity Management System designed for students. Features intelligent resource nesting, distraction blocking, and focus analytics. Built with a dual-role architecture (Admin/Customer) as a 3rd-year Software engineering Dissertation project.

## Docker (API + SPA in one container)

Build and run locally (requires `server/.env` with database and secrets):

```bash
docker compose up --build
```

Open `http://localhost:3000`. Set `ALLOWED_ORIGINS` and `CLIENT_URL` in production to your public HTTPS origin.

- **Health:** `GET /api/health` (liveness) and `GET /api/ready` (database check).
- **GitHub Actions:** `.github/workflows/ci.yml` runs tests, build, security scans, and Docker build. `.github/workflows/deploy.yml` pushes to ECR and starts an **App Runner** deployment when `APPRUNNER_SERVICE_ARN` is set (or rely on App Runner automatic deploy on `:latest`).

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
