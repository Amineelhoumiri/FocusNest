// middleware/auth.js
// Verifies the Better Auth session on every protected request.
// Replaces the old JWT-based check — no more access_token cookie decoding.
//
// Better Auth sets a session cookie (better-auth.session_token) on login.
// We call auth.api.getSession() which validates it against the ba_session table.
// If valid, we attach { user_id, email, is_admin } to req.user so downstream
// controllers don't need to change their req.user usage.

const { fromNodeHeaders } = require("better-auth/node");
const auth = require("../auth");

const authMiddleware = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "No valid session. Please log in.",
      });
    }

    // Map Better Auth's session.user to the shape controllers expect.
    req.user = {
      user_id: session.user.id,
      email: session.user.email,
      is_admin: session.user.is_admin || false,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Authentication failed.",
    });
  }
};

module.exports = authMiddleware;
