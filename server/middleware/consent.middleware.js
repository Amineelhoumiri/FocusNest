const pool = require("../config/db");

/**
 * Ensures the authenticated user has opted in to AI processing (OpenAI).
 */
async function requireAiConsent(req, res, next) {
  try {
    const r = await pool.query(
      `SELECT is_consented_ai FROM users WHERE user_id = $1`,
      [req.user.user_id]
    );
    if (!r.rows[0]?.is_consented_ai) {
      return res.status(403).json({
        error: "CONSENT_REQUIRED",
        message:
          "AI processing consent is required. Enable it in Settings or accept the prompt in the app.",
      });
    }
    next();
  } catch (err) {
    console.error("requireAiConsent:", err.message);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

/**
 * Ensures the authenticated user has opted in to Spotify integration.
 */
async function requireSpotifyConsent(req, res, next) {
  try {
    const r = await pool.query(
      `SELECT is_consented_spotify FROM users WHERE user_id = $1`,
      [req.user.user_id]
    );
    if (!r.rows[0]?.is_consented_spotify) {
      return res.status(403).json({
        error: "CONSENT_REQUIRED",
        message:
          "Spotify integration consent is required. Enable it in Settings or accept the prompt in the app.",
      });
    }
    next();
  } catch (err) {
    console.error("requireSpotifyConsent:", err.message);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
}

module.exports = { requireAiConsent, requireSpotifyConsent };
