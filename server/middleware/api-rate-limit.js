/**
 * Shared express-rate-limit presets for CodeQL / abuse resistance.
 */
const rateLimit = require("express-rate-limit");

const windowMs = 15 * 60 * 1000;

/** General JSON API — enough for normal SPA use */
const apiLimiter = rateLimit({
  windowMs,
  max: Number(process.env.API_RATE_LIMIT_MAX || 400),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

/** Consent + sensitive writes */
const consentWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.CONSENT_RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many consent requests, please try again later." },
});

module.exports = {
  apiLimiter,
  consentWriteLimiter,
};
