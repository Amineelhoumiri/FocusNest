// services/token.service.js
// Handles all JWT token operations: generating access tokens,
// generating refresh tokens, and verifying tokens.
// Used by auth controller on login/register and by auth middleware on every request.

const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto"); // Built-in Node.js module, no install needed

// Generates a short-lived JWT access token (1 hour)
// This is what gets sent on every API request to prove identity
// Payload contains the minimum needed: user_id, is_admin
const generateAccessToken = (user_id, is_admin) => {
    return jwt.sign(
        { user_id, is_admin },           // Data encoded inside the token
        process.env.JWT_SECRET,           // Secret key used to sign the token
        { expiresIn: "1h" }              // Token expires after 1 hour
    );
};

// Generates a long-lived refresh token (30 days)
// This is a random string (not a JWT) stored in the DB and used
// to issue new access tokens when the old one expires
const generateRefreshToken = () => {
    return uuidv4(); // Random UUID - unpredictable and unique
};

// Hashes the refresh token before storing it in the DB
// We never store raw tokens - only their SHA-256 hash
// Same concept as hashing passwords with bcrypt
const hashRefreshToken = (token) => {
    return crypto.createHash("sha256").update(token).digest("hex");
};

// Verifies an access token and returns the decoded payload
// Returns null if the token is invalid or expired
// Used by auth middleware to protect routes
const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null; // Invalid or expired token
    }
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    verifyAccessToken,
};