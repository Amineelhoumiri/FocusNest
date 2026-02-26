// middleware/auth.js
// This middleware runs BEFORE any protected route handler.
// It checks that the incoming request has a valid JWT token.
// If the token is missing or invalid, it blocks the request immediately.
// If valid, it attaches the decoded user data to req.user so controllers
// can access the logged-in user's id and role without querying the DB.
//
// Usage: add it to any route that requires authentication
// Example: router.get("/me", auth, userController.getMe)

const { verifyAccessToken } = require("../services/token.service");

const auth = (req, res, next) => {
    try {
        // Extract the token from the HttpOnly cookie
        // Our tokens are stored in HttpOnly cookies (not Authorization headers)
        // This is more secure because JavaScript cannot access HttpOnly cookies
        // so XSS attacks cannot steal the token
        const token = req.cookies?.access_token;

        // Check if token exists
        if (!token) {
            return res.status(401).json({
                error: "UNAUTHORIZED",
                message: "No token provided. Please log in.",
            });
        }

        // Verify the token
        // verifyAccessToken returns the decoded payload if valid
        // or null if the token is expired or tampered with
        const decoded = verifyAccessToken(token);

        if (!decoded) {
            return res.status(401).json({
                error: "UNAUTHORIZED",
                message: "Invalid or expired token. Please log in again.",
            });
        }

        // Attach user data to the request
        // Controllers can now access req.user.user_id and req.user.is_admin
        // without making an extra database query on every request
        req.user = {
            user_id: decoded.user_id,
            is_admin: decoded.is_admin,
        };

        // Pass control to the next middleware or route handler
        next();

    } catch (err) {
        console.error("Auth middleware error:", err.message);
        return res.status(500).json({
            error: "INTERNAL_SERVER_ERROR",
            message: "Authentication failed.",
        });
    }
};

module.exports = auth;