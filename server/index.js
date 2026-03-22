require("dotenv").config();
require("./instrument.js");
const express = require("express");
const Sentry = require("@sentry/node");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const pool = require("./config/db");
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


console.log("Loaded server file:", __filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    process.env.CLIENT_URL || "http://localhost:5173",
    "http://localhost:8080",
  ],
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
console.log("Spotify routes mounted. Route count:", spotifyRoutes?.stack?.length ?? 0);

app.get("/", (req, res) => {
  res.json({ message: `Server is running on port ${PORT}!` });
});

// After OAuth, Better Auth redirects here → we bounce the browser to the client
app.get("/dashboard", (req, res) => {
  res.redirect(`${process.env.CLIENT_URL || "http://localhost:8080"}/dashboard`);
});

app.get("/debug-sentry", (req, res, next) => {
  const error = new Error("My first Sentry error!");
  next(error);
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    path: req.originalUrl,
    method: req.method,
  });
});

// ─── Error Handling ──────────────────────────────────────────
Sentry.setupExpressErrorHandler(app);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✓ Server is running and listening on port ${PORT}`);
});