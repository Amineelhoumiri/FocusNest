// middleware/isAdmin.js
// This middleware runs AFTER auth.js on admin-only routes.
// auth.js already verified the JWT and attached req.user.
// This middleware simply checks if that user has is_admin: true.
// If not, it blocks the request with a 403 Forbidden response.
//
// Usage: always use AFTER auth middleware, never alone
// Example: router.get("/usage", auth, isAdmin, adminController.getUsage)

const isAdmin = (req, res, next) => {
    try {
        // Check if auth middleware ran first
        // req.user is attached by auth.js - if it doesn't exist,
        // isAdmin was used without auth which is a developer mistake
        if (!req.user) {
            return res.status(401).json({
                error: "UNAUTHORIZED",
                message: "Authentication required.",
            });
        }

        // Check if user is an admin
        // is_admin comes from the JWT payload which was set at login
        // based on the is_admin column in the users table
        if (!req.user.is_admin) {
            return res.status(403).json({
                error: "FORBIDDEN",
                message: "Admin access required.",
            });
        }

        // User is admin, allow the request through
        next();

    } catch (err) {
        console.error("isAdmin middleware error:", err.message);
        return res.status(500).json({
            error: "INTERNAL_SERVER_ERROR",
            message: "Authorization check failed.",
        });
    }
};

module.exports = isAdmin;