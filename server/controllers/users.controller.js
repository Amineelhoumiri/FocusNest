// controllers/users.controller.js
// Handles all user-related operations:
// getMe, updateMe, deleteMe (nuke), and data export (GDPR)

const pool = require("../config/db");
const bcrypt = require("bcrypt");
const { encrypt, decrypt } = require("../services/encryption.service");

// ─── Get User ─────────────────────────────────────────────────────────

/**
 * Retrieves the currently authenticated user's profile information.
 * Decrypts the user's email address safely before returning it.
 * 
 * @route GET /api/users/me
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getMe = async (req, res) => {
  try {
    const { user_id } = req.user;

    // Get user data joined with their encrypted email from account table
    const result = await pool.query(
      `SELECT u.user_id, u.full_name, u.date_of_birth, u.address,
              u.is_admin, u.created_at, u.last_login_at,
              u.is_consented_core, u.is_consented_ai, u.is_consented_spotify,
              a.encrypted_email
       FROM users u
       JOIN account a ON u.user_id = a.user_id
       WHERE u.user_id = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "User not found.",
      });
    }

    const user = result.rows[0];

    // Decrypt email before sending to client
    const email = await decrypt(user.encrypted_email.toString());

    return res.status(200).json({
      user_id: user.user_id,
      full_name: user.full_name,
      email,
      date_of_birth: user.date_of_birth,
      address: user.address,
      is_admin: user.is_admin,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
      is_consented_core: user.is_consented_core,
      is_consented_ai: user.is_consented_ai,
      is_consented_spotify: user.is_consented_spotify,
    });

  } catch (err) {
    console.error("getMe error:", err.message);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to get user.",
    });
  }
};

/**
 * Partially updates the currently authenticated user's profile metadata.
 * Can be used to update personal info or adjust base AI/Spotify consent toggles.
 * 
 * @route PATCH /api/users/me
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateMe = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { full_name, date_of_birth, address,
      is_consented_ai, is_consented_spotify } = req.body;

    // Build dynamic query that only update fields that were provided
    const fields = [];
    const values = [];
    let index = 1;

    if (full_name !== undefined) {
      fields.push(`full_name = $${index++}`);
      values.push(full_name);
    }
    if (date_of_birth !== undefined) {
      fields.push(`date_of_birth = $${index++}`);
      values.push(date_of_birth);
    }
    if (address !== undefined) {
      fields.push(`address = $${index++}`);
      values.push(address);
    }
    if (is_consented_ai !== undefined) {
      fields.push(`is_consented_ai = $${index++}`);
      values.push(is_consented_ai);
    }
    if (is_consented_spotify !== undefined) {
      fields.push(`is_consented_spotify = $${index++}`);
      values.push(is_consented_spotify);
    }

    // If nothing was sent in the body, return early
    if (fields.length === 0) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "No fields provided to update.",
      });
    }

    values.push(user_id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(", ")} 
       WHERE user_id = $${index}
       RETURNING user_id, full_name, date_of_birth, address,
                 is_consented_ai, is_consented_spotify`,
      values
    );

    return res.status(200).json(result.rows[0]);

  } catch (err) {
    console.error("updateMe error:", err.message);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to update user.",
    });
  }
};

// ─── Delete Account (Nuke) ──────────────────────────────────────────────────

/**
 * PERMANENTLY deletes the authenticated user's account and all associated data inside the system.
 * This is a destructive CASCADE operation resolving GDPR right to erasure.
 * Requires user confirmation via password validation before nuking.
 * 
 * @route DELETE /api/users/me/nuke
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const nukeAccount = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { password } = req.body;

    // Require password confirmation before deleting
    if (!password) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Password confirmation required.",
      });
    }

    // Get the password hash to verify
    const accountResult = await pool.query(
      `SELECT password_hash FROM account WHERE user_id = $1`,
      [user_id]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Account not found.",
      });
    }

    // Verify password before allowing deletion
    const passwordMatch = await bcrypt.compare(
      password,
      accountResult.rows[0].password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        error: "INVALID_PASSWORD",
        message: "Incorrect password.",
      });
    }

    // Delete user ,CASCADE will automatically delete all related data
    // (account, tasks, subtasks, sessions, chat_sessions, refresh_tokens etc.)
    await pool.query(`DELETE FROM users WHERE user_id = $1`, [user_id]);

    // Clear cookies
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    return res.status(204).send();

  } catch (err) {
    console.error("nukeAccount error:", err.message);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete account.",
    });
  }
};

// ─── Export User Data (GDPR) ──────────────────────────────────────────────────

/**
 * Compiles all data related to the authenticated user from the database and returns it as a formatted JSON document.
 * This satisfies GDPR "right to data portability" requirements.
 * 
 * @route GET /api/users/me/export
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const exportData = async (req, res) => {
  try {
    const { user_id } = req.user;

    // Fetch all user data from every table
    const [user, tasks, sessions, chatSessions, consentLog] =
      await Promise.all([
        pool.query(
          `SELECT u.*, a.encrypted_email 
           FROM users u JOIN account a ON u.user_id = a.user_id 
           WHERE u.user_id = $1`,
          [user_id]
        ),
        pool.query(`SELECT * FROM tasks WHERE user_id = $1`, [user_id]),
        pool.query(`SELECT * FROM session WHERE user_id = $1`, [user_id]),
        pool.query(`SELECT * FROM chat_sessions WHERE user_id = $1`, [user_id]),
        pool.query(
          `SELECT * FROM consent_audit_log WHERE user_id = $1`,
          [user_id]
        ),
      ]);

    const userData = user.rows[0];

    // Build the export object
    const exportData = {
      exported_at: new Date().toISOString(),
      user: {
        user_id: userData.user_id,
        full_name: userData.full_name,
        email: await decrypt(userData.encrypted_email.toString()),
        date_of_birth: userData.date_of_birth,
        address: userData.address,
        created_at: userData.created_at,
      },
      tasks: tasks.rows,
      sessions: sessions.rows,
      chat_sessions: chatSessions.rows,
      consent_log: consentLog.rows,
    };

    // Set headers to trigger file download in browser
    res.setHeader("Content-Disposition", "attachment; filename=my-data.json");
    res.setHeader("Content-Type", "application/json");

    return res.status(200).json(exportData);

  } catch (err) {
    console.error("exportData error:", err.message);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to export data.",
    });
  }
};

module.exports = { getMe, updateMe, nukeAccount, exportData };