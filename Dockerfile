# FocusNest — multi-stage: build Vite client + production Node server (serves API + static SPA)
# ─── Build client ─────────────────────────────────────────────────────────────
# Use a specific Alpine major to reduce surprise CVEs between releases.
# (Trivy gate in CI is sensitive to HIGH/CRITICAL vulns in base images.)
FROM node:22-alpine3.21 AS client-build
WORKDIR /app/client

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_POSTHOG_KEY=
ENV VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY
ARG VITE_POSTHOG_HOST=https://eu.i.posthog.com
ENV VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST
RUN npm run build

# ─── Runtime ─────────────────────────────────────────────────────────────────
FROM node:22-alpine3.21 AS runtime

# Upgrade all base OS packages so fixable Alpine CVEs are patched; dumb-init for PID 1
RUN apk upgrade --no-cache \
    && apk add --no-cache dumb-init

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV STATIC_DIR=/app/client/dist

COPY server/package.json server/package-lock.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

# Remove npm toolchain from runtime — only needed at build. Official images bundle npm
# with a vulnerable glob CLI (CVE-2025-64756); we only run `node` in production.
RUN rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

COPY server/ ./
COPY docs/ /app/docs/

COPY --from=client-build /app/client/dist /app/client/dist

RUN addgroup -S focusnest && adduser -S -G focusnest focusnest \
    && chown -R focusnest:focusnest /app

USER focusnest
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
