require("dotenv").config();
require("./instrument.js");

const express = require("express");
const Sentry = require("@sentry/node");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const pool = require("./config/db");

const authRoutes = require("./routes/auth.routes");  // Import auth routes
const usersRoutes = require("./routes/users.routes");  // Import users routes


console.log("Loaded server file:", __filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Routes ─────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use("/api/auth", authRoutes);
console.log("Auth routes mounted. Route count:", authRoutes?.stack?.length ?? 0);

app.use("/api/users", usersRoutes);
console.log("Users routes mounted. Route count:", usersRoutes?.stack?.length ?? 0)

app.get("/", (req, res) => {
  res.json({ message: `Server is running on port ${PORT}!` });
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