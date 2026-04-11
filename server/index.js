require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const { applyDevEnvDefaults } = require("./dev-env-defaults");
applyDevEnvDefaults();
require("./instrument.js");
const { runStartupCheck } = require("./startup-check");
runStartupCheck();
const path = require("path");
const fs = require("fs");
const express = require("express");
const Sentry = require("@sentry/node");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const pool = require("./config/db");
const { getTrustedOrigins } = require("./config/allowedOrigins");
const { toNodeHandler } = require("better-auth/node");
const auth = require("./auth");
const {
  ensureAnonymousCsrfSid,
  generateCsrfToken,
  doubleCsrfProtection,
} = require("./middleware/csrf-config");
const { apiLimiter, consentWriteLimiter } = require("./middleware/api-rate-limit");
const authMiddleware = require("./middleware/auth");
const { recordInitialConsent } = require("./controllers/consent.controller");

const usersRoutes = require("./routes/users.routes");
const tasksRoutes = require("./routes/tasks.routes");
const sessionsRoutes = require("./routes/sessions.routes");
const subtasksRoutes = require("./routes/subtasks.routes");
const chatRoutes = require("./routes/chat.routes");
const uploadRoutes = require("./routes/upload.routes");
const consentRoutes = require("./routes/consent.routes");
const adminRoutes = require("./routes/admin.routes");
const aiRoutes = require("./routes/ai.routes");
const spotifyRoutes = require("./routes/spotify.routes");
const musicRoutes   = require("./routes/music.routes");

console.log("Loaded server file:", __filename);

const app = express();
const PORT = process.env.PORT || 3000;

// App Runner / ALB sit in front — trust one proxy hop so express-rate-limit
// sees the real client IP from X-Forwarded-For instead of blocking all traffic.
app.set("trust proxy", 1);

// ─── Middleware ──────────────────────────────────────────────
// CSP disabled so Vite/React assets and OAuth flows work without per-hash config
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: getTrustedOrigins(),
  credentials: true,
}));
// Note: express.json() is NOT applied before Better Auth so it can read its own body.
app.use(cookieParser());
app.use(ensureAnonymousCsrfSid);
app.use("/api", apiLimiter);

app.use((req, res, next) => {
  if (process.env.NODE_ENV !== "production" && req.path.startsWith("/api")) {
    console.log(`[req] ${req.method} ${req.originalUrl || req.url}`);
  }
  next();
});

app.get("/api/csrf-token", (req, res) => {
  const token = generateCsrfToken(req, res);
  res.status(200).json({ csrfToken: token });
});
app.use(doubleCsrfProtection);

// ─── App consent endpoint (must run before Better Auth catch-all) ───────────
// FR-L-03 / dissertation spec: POST /api/auth/consent — JSON body, session cookie auth.
app.post(
  "/api/auth/consent",
  consentWriteLimiter,
  express.json(),
  authMiddleware,
  recordInitialConsent
);

// ─── Better Auth ─────────────────────────────────────────────
// Must be mounted before express.json() so Better Auth handles its own body parsing.
// Express 5 requires named wildcard parameters — use {*path} instead of /*.
app.all("/api/auth/{*path}", toNodeHandler(auth));
console.log("Better Auth handler mounted at /api/auth/{*path}");

// ─── Body Parsing (after Better Auth) ────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ─────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
app.use("/api/sessions", sessionsRoutes);
console.log("Sessions routes mounted. Route count:", sessionsRoutes?.stack?.length ?? 0);

app.use("/api/tasks/:task_id/subtasks", subtasksRoutes);
console.log("Subtasks routes mounted. Route count:", subtasksRoutes?.stack?.length ?? 0);

app.use("/api/users", usersRoutes);
console.log("Users routes mounted. Route count:", usersRoutes?.stack?.length ?? 0);

app.use("/api/tasks", tasksRoutes);
console.log("Tasks routes mounted. Route count:", tasksRoutes?.stack?.length ?? 0);

app.use("/api/chat", chatRoutes);
console.log("Chat routes mounted. Route count:", chatRoutes?.stack?.length ?? 0);

app.use("/api/upload", uploadRoutes);
console.log("Upload routes mounted. Route count:", uploadRoutes?.stack?.length ?? 0);

app.use("/api/consent", consentWriteLimiter, consentRoutes);
console.log("Consent routes mounted. Route count:", consentRoutes?.stack?.length ?? 0);

app.use("/api/admin", adminRoutes);
console.log("Admin routes mounted. Route count:", adminRoutes?.stack?.length ?? 0);

app.use("/api/ai", aiRoutes);
console.log("AI routes mounted. Route count:", aiRoutes?.stack?.length ?? 0);

app.use("/api/spotify", spotifyRoutes);
app.use("/api/music",   musicRoutes);
console.log("Spotify routes mounted. Route count:", spotifyRoutes?.stack?.length ?? 0);

// ALB / uptime checks (no DB — fast liveness)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Optional readiness (DB)
app.get("/api/ready", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ready" });
  } catch (e) {
    res.status(503).json({ status: "not_ready", message: e.message });
  }
});

app.get("/debug-sentry", (req, res, next) => {
  const error = new Error("My first Sentry error!");
  next(error);
});

// ─── Swagger UI (non-production — MVP §7) ───────────────────────────────────
const swaggerEnabled =
  process.env.ENABLE_SWAGGER !== "0" && process.env.NODE_ENV !== "production";
if (swaggerEnabled) {
  try {
    const swaggerUi = require("swagger-ui-express");
    const YAML = require("yaml");
    const specPath = path.join(__dirname, "..", "docs", "swagger.yaml");
    if (fs.existsSync(specPath)) {
      const spec = YAML.parse(fs.readFileSync(specPath, "utf8"));
      app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: "FocusNest API" }));
      console.log("Swagger UI available at /api/docs");
    } else {
      console.warn("Swagger: docs/swagger.yaml not found — skipping /api/docs");
    }
  } catch (e) {
    console.warn("Swagger UI failed to load:", e.message);
  }
}

// ─── Static SPA (production Docker / same-origin deploy) ────────────────────
const staticDir = process.env.STATIC_DIR || path.join(__dirname, "../client/dist");
const spaEnabled = fs.existsSync(staticDir);

if (spaEnabled) {
  console.log("Serving SPA from", staticDir);
  app.use(express.static(staticDir, { fallthrough: true, index: false }));
  app.get("/{*path}", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(staticDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });
} else {
  app.get("/", (req, res) => {
    res.json({ message: `Server is running on port ${PORT}!`, spa: false });
  });
}

// API-only 404 (JSON)
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      error: "Not Found",
      path: req.originalUrl,
      method: req.method,
    });
  }
  return next();
});

// Non-API fallback
app.use((req, res) => {
  res.status(404).type("text").send("Not found");
});

// ─── Error Handling ──────────────────────────────────────────
Sentry.setupExpressErrorHandler(app);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start Server ────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✓ Server is running and listening on port ${PORT}`);
  });
}

module.exports = app;
