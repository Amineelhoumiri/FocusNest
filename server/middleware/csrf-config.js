/**
 * Double-submit cookie CSRF (csrf-csrf). Skips Better Auth JSON endpoints under /api/auth/*
 * except POST /api/auth/consent, which uses session cookies and must be CSRF-protected.
 * Disabled when NODE_ENV === "test" or DISABLE_CSRF === "1".
 */
const crypto = require("crypto");
const { doubleCsrf } = require("csrf-csrf");

const isProd = process.env.NODE_ENV === "production";

function getCsrfSecret() {
  const s = process.env.CSRF_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!s && process.env.NODE_ENV !== "test") {
    throw new Error("Set CSRF_SECRET or BETTER_AUTH_SECRET for CSRF signing");
  }
  return s || "test-only-csrf-secret";
}

/** Anonymous browsers get a stable first-party id for CSRF session binding (no express-session). */
function ensureAnonymousCsrfSid(req, res, next) {
  const existing = req.cookies && req.cookies["fn-csrf-sid"];
  if (existing) return next();
  const id = crypto.randomBytes(16).toString("hex");
  res.cookie("fn-csrf-sid", id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProd,
  });
  req.cookies = { ...(req.cookies || {}), "fn-csrf-sid": id };
  next();
}

const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => getCsrfSecret(),
  getSessionIdentifier: (req) => {
    const c = req.cookies || {};
    const ba =
      c["better-auth.session_token"] ||
      c["__Secure-better-auth.session_token"] ||
      c["better-auth.session"];
    if (ba) return `ba:${String(ba).slice(0, 128)}`;
    return `anon:${c["fn-csrf-sid"] || "unset"}`;
  },
  cookieName: isProd ? "__Host-fn.x-csrf-token" : "fn.x-csrf-token",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProd,
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"],
  skipCsrfProtection: (req) => {
    if (process.env.NODE_ENV === "test" || process.env.DISABLE_CSRF === "1") return true;
    const p = req.path || "";
    if (p.startsWith("/api/auth") && p !== "/api/auth/consent") return true;
    return false;
  },
});

module.exports = {
  ensureAnonymousCsrfSid,
  generateCsrfToken,
  doubleCsrfProtection,
};
