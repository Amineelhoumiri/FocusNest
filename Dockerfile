# FocusNest — multi-stage: build Vite client + production Node server (serves API + static SPA)

# ─── Build client ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS client-build
WORKDIR /app/client

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ─── Runtime ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

RUN apk add --no-cache dumb-init

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV STATIC_DIR=/app/client/dist

COPY server/package.json server/package-lock.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

COPY server/ ./

COPY --from=client-build /app/client/dist /app/client/dist

RUN addgroup -S focusnest && adduser -S -G focusnest focusnest \
    && chown -R focusnest:focusnest /app

USER focusnest
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
