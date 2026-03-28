require("dotenv").config({ path: require("path").join(__dirname, ".env") });
require("./instrument.js");
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

const usersRoutes = require("./routes/users.routes");  // Import users routes
const tasksRoutes = require("./routes/tasks.routes");  // Import tasks routes
const sessionsRoutes = require("./routes/sessions.routes"); // Import sessions routes
const subtasksRoutes = require("./routes/subtasks.routes");  // Import subtasks routes
const chatRoutes = require("./routes/chat.routes");
const consentRoutes = require("./routes/consent.routes");
const adminRoutes = require("./routes/admin.routes");
const aiRoutes = require("./routes/ai.routes");
const spotifyRoutes = require("./routes/spotify.routes");
const musicRoutes   = require("./routes/music.routes");


console.log("Loaded server file:", __filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────
// CSP disabled so Vite/React assets and OAuth flows work without per-hash config
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: getTrustedOrigins(),
  credentials: true,
}));
// Note: express.json() is NOT applied before Better Auth so it can read its own body.
app.use(cookieParser());

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

app.use("/api/consent", consentRoutes);
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

// After OAuth, Better Auth redirects here → we bounce the browser to the client
app.get("/dashboard", (req, res) => {
  res.redirect(`${process.env.CLIENT_URL || "http://localhost:8080"}/dashboard`);
});

app.get("/debug-sentry", (req, res, next) => {
  const error = new Error("My first Sentry error!");
  next(error);
});

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