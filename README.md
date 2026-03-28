# FocusNest
A SaaS-ready Productivity Management System designed for students. Features intelligent resource nesting, distraction blocking, and focus analytics. Built with a dual-role architecture (Admin/Customer) as a 3rd-year Software engineering Dissertation project.

## Docker (API + SPA in one container)

Build and run locally (requires `server/.env` with database and secrets):

```bash
docker compose up --build
```

Open `http://localhost:3000`. Set `ALLOWED_ORIGINS` and `CLIENT_URL` in production to your public HTTPS origin.

- **Health:** `GET /api/health` (liveness) and `GET /api/ready` (database check).
- **GitHub Actions:** `.github/workflows/ci.yml` runs tests, build, lint (non-blocking), npm audit (non-blocking), Docker build, and Trivy scan. `.github/workflows/deploy.yml` pushes to ECR and forces an ECS rollout when AWS OIDC secrets are configured.
