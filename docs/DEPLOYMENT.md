# Production deployment (AWS)

The production path in this repository is: **build the multi-stage [Dockerfile](Dockerfile) → push to **Amazon ECR** → run on **AWS App Runner** (or any container host) with **PostgreSQL (RDS)** on a private network.

## What the container runs

- **One process**: Node 22 serves the Express API on `PORT` (default `3000`) and the built Vite static files from `STATIC_DIR` (`/app/client/dist` in the image).
- **No secrets in git**: `POSTHOG_API_KEY`, database passwords, and OAuth client secrets are injected as environment variables in App Runner (or your orchestrator), not baked into the image.

## GitHub Actions

| Workflow | When | Purpose |
|----------|------|---------|
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Push/PR to `main` or `dev` | Tests, lint, Docker build, Trivy scan |
| [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | Tag `v*` or manual dispatch | OIDC to AWS, ECR push, optional App Runner deploy |

### Repository secrets and variables (deploy)

| Name | Type | Use |
|------|------|-----|
| `AWS_ROLE_ARN` | Secret | OIDC role for deploy workflow |
| `AWS_REGION` | Secret | e.g. `eu-west-2` |
| `ECR_REPOSITORY` | Secret | ECR repository name |
| `APPRUNNER_SERVICE_ARN` | Secret (optional) | Triggers a deployment after push |
| `VITE_POSTHOG_KEY` | Secret (optional) | Baked into client bundle at build time |
| `VITE_SENTRY_DSN` | Secret (optional) | Client Sentry DSN for the bundle |
| `PUBLIC_APP_URL` | Variable | Passed as `VITE_API_URL` to the Vite build |
| `VITE_POSTHOG_HOST` | Variable (optional) | PostHog API host, default in Dockerfile is EU cloud |

**Important:** A PostHog or Sentry key that was ever committed to the repo should be **rotated** in the product dashboard; treat historical commits as public.

## Runtime environment (App Runner / container)

Set at least the variables validated in [`server/startup-check.js`](server/startup-check.js) for production, including `DB_*`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CLIENT_URL`, `AWS_REGION`, and `KMS_KEY_ID`. Use [`server/.env.example`](server/.env.example) as the full checklist, including optional `OPENAI_API_KEY`, `SENTRY_DSN`, `POSTHOG_API_KEY`, and Spotify / Google OAuth.

Public URLs in production should use **https**; `BETTER_AUTH_URL` and `CLIENT_URL` must match the app’s real origin (see deploy workflow log hints after `Start App Runner deployment`).

## Build-time client environment (Vite)

These are **build arguments** in the Docker image (see the `client-build` stage in the [Dockerfile](Dockerfile)):

- `VITE_API_URL` — usually your public `https://` app URL (set via `PUBLIC_APP_URL` in CI).
- `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` / `VITE_SENTRY_DSN` — optional; leave unset to disable.

Local templates: [`client/.env.example`](client/.env.example).
