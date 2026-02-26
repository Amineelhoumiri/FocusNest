// controllers/auth.controller.js
// Handles all authentication logic:
// register, login, refresh token, and logout.
// This is the most critical controller — it handles security directly.

const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { encrypt, decrypt } = require("../services/encryption.service");
const {
    generateAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    verifyAccessToken,
} = require("../services/token.service");

// Centralizes cookie configuration so it's consistent across register and login
const setTokenCookies = (res, accessToken, refreshToken) => {
    // Access token cookie - short lived (1 hour)
    res.cookie("access_token", accessToken, {
        httpOnly: true,   // JavaScript cannot access this cookie (XSS protection)
        secure: process.env.NODE_ENV === "production", // HTTPS only in production
        sameSite: "strict", // Prevents CSRF attacks
        maxAge: 60 * 60 * 1000, // 1 hour in milliseconds
    });

    // Refresh token cookie - long lived (30 days)
    res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    });
};

// POST /api/auth/register
// Creates a new user and account, sets HttpOnly cookies with tokens
const register = async (req, res) => {
    try {
        const { email, password, full_name, date_of_birth, address } = req.body;

        // Validate required fields
        if (!email || !password || !full_name) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "Email, password and full name are required.",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "Password must be at least 8 characters.",
            });
        }

        // Encrypt email and check if it already exists
        const encryptedEmail = encrypt(email.toLowerCase());

        // Check all existing emails by decrypting and comparing
        // We store encrypted so we can't use a simple WHERE clause
        const existingAccounts = await pool.query(
            "SELECT encrypted_email FROM account"
        );

        const emailExists = existingAccounts.rows.some(
            (row) => decrypt(row.encrypted_email.toString()) === email.toLowerCase()
        );

        if (emailExists) {
            return res.status(409).json({
                error: "EMAIL_EXISTS",
                message: "An account with this email already exists.",
            });
        }

        // Hash the password
        // bcrypt automatically generates and stores the salt
        // 12 rounds is a good balance between security and performance
        const passwordHash = await bcrypt.hash(password, 12);

        // Insert into users table
        const newUser = await pool.query(
            `INSERT INTO users 
        (full_name, date_of_birth, address, is_consented_core, is_consented_ai, is_consented_spotify)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, full_name, is_admin`,
            [
                full_name,
                date_of_birth || null,
                address || null,
                true,  // core consent is required to register
                false, // AI consent defaults to false
                false, // Spotify consent defaults to false
            ]
        );

        const user = newUser.rows[0];

        // Insert into account table
        await pool.query(
            `INSERT INTO account (user_id, encrypted_email, password_hash)
       VALUES ($1, $2, $3)`,
            [user.user_id, Buffer.from(encryptedEmail), passwordHash]
        );

        // Generate tokens
        const accessToken = generateAccessToken(user.user_id, user.is_admin);
        const refreshToken = generateRefreshToken();
        const refreshTokenHash = hashRefreshToken(refreshToken);

        // Store hashed refresh token in DB
        await pool.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
            [user.user_id, refreshTokenHash]
        );

        // Set HttpOnly cookies
        setTokenCookies(res, accessToken, refreshToken);

        // Return response (no tokens in body)
        return res.status(201).json({
            user_id: user.user_id,
        });

    } catch (err) {
        console.error("Register error:", err.message);
        return res.status(500).json({
            error: "INTERNAL_SERVER_ERROR",
            message: "Registration failed.",
        });
    }
};

// POST /api/auth/login
// Verifies credentials and sets HttpOnly cookies with tokens
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "Email and password are required.",
            });
        }

        // Find account by decrypting and comparing emails
        const allAccounts = await pool.query(
            `SELECT a.account_id, a.encrypted_email, a.password_hash, a.is_active,
              u.user_id, u.is_admin
       FROM account a
       JOIN users u ON a.user_id = u.user_id`
        );

        const account = allAccounts.rows.find(
            (row) => decrypt(row.encrypted_email.toString()) === email.toLowerCase()
        );

        if (!account) {
            return res.status(401).json({
                error: "INVALID_CREDENTIALS",
                message: "Invalid email or password.",
            });
        }

        // Check if account is active
        if (!account.is_active) {
            return res.status(401).json({
                error: "ACCOUNT_INACTIVE",
                message: "This account has been deactivated.",
            });
        }

        // Compare password with stored hash
        const passwordMatch = await bcrypt.compare(password, account.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({
                error: "INVALID_CREDENTIALS",
                message: "Invalid email or password.",
            });
        }

        // Generate tokens
        const accessToken = generateAccessToken(account.user_id, account.is_admin);
        const refreshToken = generateRefreshToken();
        const refreshTokenHash = hashRefreshToken(refreshToken);

        // Store hashed refresh token in DB
        await pool.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
            [account.user_id, refreshTokenHash]
        );

        // Update last_login_at
        await pool.query(
            `UPDATE users SET last_login_at = NOW() WHERE user_id = $1`,
            [account.user_id]
        );

        // Set HttpOnly cookies
        setTokenCookies(res, accessToken, refreshToken);

        // Return response
        return res.status(200).json({
            user_id: account.user_id,
            expires_in: 3600,
        });

    } catch (err) {
        console.error("Login error:", err.message);
        return res.status(500).json({
            error: "INTERNAL_SERVER_ERROR",
            message: "Login failed.",
        });
    }
};

// POST /api/auth/refresh
// Issues a new access token using the refresh token from the cookie
const refresh = async (req, res) => {
    try {
        // Get refresh token from cookie
        const refreshToken = req.cookies?.refresh_token;

        if (!refreshToken) {
            return res.status(401).json({
                error: "UNAUTHORIZED",
                message: "No refresh token provided.",
            });
        }

        // Hash the token and look it up in DB
        const refreshTokenHash = hashRefreshToken(refreshToken);

        const tokenRecord = await pool.query(
            `SELECT * FROM refresh_tokens 
       WHERE token_hash = $1 
       AND is_revoked = FALSE 
       AND expires_at > NOW()`,
            [refreshTokenHash]
        );

        if (tokenRecord.rows.length === 0) {
            return res.status(401).json({
                error: "INVALID_TOKEN",
                message: "Refresh token is invalid or expired.",
            });
        }

        const { user_id } = tokenRecord.rows[0];

        // Get user details
        const userResult = await pool.query(
            `SELECT user_id, is_admin FROM users WHERE user_id = $1`,
            [user_id]
        );

        const user = userResult.rows[0];

        // Generate new access token
        const newAccessToken = generateAccessToken(user.user_id, user.is_admin);

        // Set new access token cookie
        res.cookie("access_token", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 1000,
        });

        return res.status(200).json({ expires_in: 3600 });

    } catch (err) {
        console.error("Refresh error:", err.message);
        return res.status(500).json({
            error: "INTERNAL_SERVER_ERROR",
            message: "Token refresh failed.",
        });
    }
};

// POST /api/auth/logout
// Revokes the refresh token in DB and clears both cookies
const logout = async (req, res) => {
    try {
        // Get refresh token from cookie
        const refreshToken = req.cookies?.refresh_token;

        if (refreshToken) {
            // Hash and revoke the token in DB
            const refreshTokenHash = hashRefreshToken(refreshToken);

            await pool.query(
                `UPDATE refresh_tokens SET is_revoked = TRUE WHERE token_hash = $1`,
                [refreshTokenHash]
            );
        }

        // Clear both cookies
        res.clearCookie("access_token");
        res.clearCookie("refresh_token");

        return res.status(204).send();

    } catch (err) {
        console.error("Logout error:", err.message);
        return res.status(500).json({
            error: "INTERNAL_SERVER_ERROR",
            message: "Logout failed.",
        });
    }
};

module.exports = { register, login, refresh, logout };