# Contributing

## Requirements

- **Node.js 22+** (see `engines` in the root, `client/`, and `server/` `package.json` files — aligned with the [Dockerfile](Dockerfile) base image).
- **PostgreSQL** for a full run; `docker compose up` from the repo root starts a local database (see the main [README](README.md)).

## Workflow

1. **Branch** from `dev` or `main` using a short, descriptive name (e.g. `fix/csrf-cookie` or `feat/task-export`).
2. **Run tests** before opening a PR:
   - `cd server && npm test`
   - `cd client && npm test && npm run lint`
   - Or from the repo root: `npm test` (runs server then client tests).
3. **Open a pull request** into `dev` (or `main` for hotfixes, if that is the team rule). The PR template in CI: dependency review and other checks in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Code style

- Match existing formatting and import style in the file you change.
- Do not commit real API keys, tokens, or `.env` files; use `server/.env.example` and `client/.env.example` as templates only.

## Security

Report sensitive issues using the process in [SECURITY.md](SECURITY.md) instead of a public issue when disclosure could put users at risk.
