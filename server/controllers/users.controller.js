// controllers/users.controller.js
// Handles all user-related operations:
// getMe, updateMe, deleteMe (nuke), and data export (GDPR)

const pool = require("../config/db");
const bcrypt = require("bcrypt");
const { verifyPassword, hashPassword } = require("better-auth/crypto");
const { decrypt } = require("../services/encryption.service");

// ─── Get User ─────────────────────────────────────────────────────────

/**
 * Retrieves the currently authenticated user's profile information.
 * Email comes directly from the Better Auth session (req.user.email),
 * so no decryption step is needed.
 *
 * @route GET /api/users/me
 */
/** Mirror Better Auth `"user"` row into `users` when missing (e.g. hook failed on NULL date_of_birth). */
async function ensureAppUserRow(userId) {
  const existing = await pool.query(`SELECT 1 FROM users WHERE user_id = $1`, [userId]);
  if (existing.rows.length > 0) return;

  const ba = await pool.query(
    `SELECT id, name, email, full_name, date_of_birth, is_admin, is_consented_ai, is_consented_spotify
     FROM "user" WHERE id = $1`,
    [userId]
  );
  if (ba.rows.length === 0) return;

  const row = ba.rows[0];
  const fullName =
    row.full_name || row.name || (row.email ? String(row.email).split("@")[0] : null) || "User";
  const dobRaw = row.date_of_birth;
  const dob =
    dobRaw != null && String(dobRaw).trim() !== "" ? String(dobRaw).trim() : "2000-01-01";

  await pool.query(
    `INSERT INTO users
       (user_id, full_name, date_of_birth, is_consented_core, is_consented_ai, is_consented_spotify, is_admin)
     VALUES ($1, $2, $3::date, FALSE, COALESCE($4, false), COALESCE($5, false), COALESCE($6, false))
     ON CONFLICT (user_id) DO NOTHING`,
    [row.id, fullName, dob, row.is_consented_ai, row.is_consented_spotify, row.is_admin]
  );
}

const getMe = async (req, res) => {
  try {
    const { user_id, email } = req.user;

    await ensureAppUserRow(user_id);

    const result = await pool.query(
      `SELECT u.user_id, u.full_name, u.date_of_birth, u.address, u.profile_photo_url, u.phone_number,
              u.is_admin, u.created_at, u.last_login_at,
              u.is_consented_core, u.is_consented_ai, u.is_consented_spotify,
              u.focus_score
       FROM users u
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

    // Calculate streak: count consecutive days ending today with at least one completed session
    const streakDaysResult = await pool.query(
      `WITH daily AS (
         SELECT DISTINCT DATE(end_time) AS d
         FROM focus_session
         WHERE user_id = $1 AND outcome = 'completed' AND end_time IS NOT NULL
       ),
       ranked AS (
         SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d))::INTEGER AS grp
         FROM daily
       ),
       streaks AS (
         SELECT grp, MAX(d) AS last_day, COUNT(*) AS len
         FROM ranked
         GROUP BY grp
       )
       SELECT COALESCE(len, 0)::INTEGER AS streak
       FROM streaks
       WHERE last_day = CURRENT_DATE
       LIMIT 1`,
      [user_id]
    );

    const streak = streakDaysResult.rows[0]?.streak ?? 0;

    return res.status(200).json({
      user_id: user.user_id,
      full_name: user.full_name,
      email,
      phone_number: user.phone_number,
      date_of_birth: user.date_of_birth,
      address: user.address,
      profile_photo_url: user.profile_photo_url,
      is_admin: user.is_admin,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
      is_consented_core: user.is_consented_core,
      is_consented_ai: user.is_consented_ai,
      is_consented_spotify: user.is_consented_spotify,
      focus_score: user.focus_score ?? 0,
      streak,
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
 *
 * @route PATCH /api/users/me
 */
const updateMe = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { full_name, date_of_birth, address, profile_photo_url, phone_number,
      is_consented_ai, is_consented_spotify } = req.body;

    const fields = [];
    const values = [];
    let index = 1;

    if (full_name !== undefined) { fields.push(`full_name = $${index++}`); values.push(full_name); }
    if (date_of_birth !== undefined) { fields.push(`date_of_birth = $${index++}`); values.push(date_of_birth); }
    if (address !== undefined) { fields.push(`address = $${index++}`); values.push(address); }
    if (phone_number !== undefined) { fields.push(`phone_number = $${index++}`); values.push(phone_number); }
    if (profile_photo_url !== undefined) { fields.push(`profile_photo_url = $${index++}`); values.push(profile_photo_url); }
    if (is_consented_ai !== undefined) { fields.push(`is_consented_ai = $${index++}`); values.push(is_consented_ai); }
    if (is_consented_spotify !== undefined) { fields.push(`is_consented_spotify = $${index++}`); values.push(is_consented_spotify); }

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
       RETURNING user_id, full_name, date_of_birth, address, profile_photo_url, phone_number,
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
 * PERMANENTLY deletes the authenticated user's account and all associated data.
 * For credential (email/password) users, requires password confirmation.
 * For OAuth-only users, skips password check.
 *
 * @route DELETE /api/users/me/nuke
 */
const nukeAccount = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { password } = req.body;

    // Check if this user has a credential (email/password) account
    // Better Auth uses camelCase columns: "userId", "providerId"
    const accountResult = await pool.query(
      `SELECT password FROM account WHERE "userId" = $1 AND "providerId" = 'credential'`,
      [user_id]
    );

    const hasPassword = accountResult.rows.length > 0 && accountResult.rows[0].password;

    if (hasPassword) {
      if (!password) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Password confirmation required.",
        });
      }

      const passwordMatch = await verifyPassword({ password, hash: accountResult.rows[0].password });
      if (!passwordMatch) {
        return res.status(401).json({
          error: "INVALID_PASSWORD",
          message: "Incorrect password.",
        });
      }
    }

    // Delete from both tables — CASCADE handles children of each.
    // "user" is quoted because it is a PostgreSQL reserved keyword.
    await pool.query(`DELETE FROM users WHERE user_id = $1`, [user_id]);
    await pool.query(`DELETE FROM "user" WHERE id = $1`, [user_id]);

    // Clear the Better Auth session cookie
    res.clearCookie("better-auth.session_token");

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
 * Compiles all data related to the authenticated user and returns it as JSON.
 * Satisfies GDPR "right to data portability".
 *
 * @route GET /api/users/me/export
 */
const exportData = async (req, res) => {
  try {
    const { user_id, email } = req.user;

    const [user, tasks, sessions, chatSessions, consentLog] =
      await Promise.all([
        pool.query(`SELECT * FROM users WHERE user_id = $1`, [user_id]),
        pool.query(`SELECT * FROM tasks WHERE user_id = $1`, [user_id]),
        pool.query(`SELECT * FROM focus_session WHERE user_id = $1`, [user_id]),
        pool.query(`SELECT * FROM chat_sessions WHERE user_id = $1`, [user_id]),
        pool.query(`SELECT * FROM consent_audit_log WHERE user_id = $1`, [user_id]),
      ]);

    const userData = user.rows[0];

    const sessionsDecrypted = await Promise.all(
      sessions.rows.map(async (row) => {
        const copy = { ...row };
        if (copy.reflection_content != null) {
          try {
            copy.reflection_content = await decrypt(copy.reflection_content.toString());
          } catch {
            copy.reflection_content = null;
          }
        }
        return copy;
      })
    );

    const exportPayload = {
      exported_at: new Date().toISOString(),
      user: {
        user_id: userData.user_id,
        full_name: userData.full_name,
        email,
        date_of_birth: userData.date_of_birth,
        address: userData.address,
        created_at: userData.created_at,
      },
      tasks: tasks.rows,
      sessions: sessionsDecrypted,
      chat_sessions: chatSessions.rows,
      consent_log: consentLog.rows,
    };

    res.setHeader("Content-Disposition", "attachment; filename=my-data.json");
    res.setHeader("Content-Type", "application/json");

    return res.status(200).json(exportPayload);

  } catch (err) {
    console.error("exportData error:", err.message);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to export data.",
    });
  }
};

// ─── Change Password ──────────────────────────────────────────────────────────

/**
 * Allows the authenticated user to change their password.
 * Reads and writes the password from/to account (Better Auth's credential table).
 *
 * @route POST /api/users/me/password
 */
const changePassword = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Current and new password are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "New password must be at least 8 characters.",
      });
    }

    const accountResult = await pool.query(
      `SELECT password FROM account WHERE "userId" = $1 AND "providerId" = 'credential'`,
      [user_id]
    );

    if (accountResult.rows.length === 0 || !accountResult.rows[0].password) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "No password-based account found.",
      });
    }

    const isMatch = await verifyPassword({ password: currentPassword, hash: accountResult.rows[0].password });
    if (!isMatch) {
      return res.status(401).json({
        error: "INVALID_PASSWORD",
        message: "Your current password is incorrect.",
      });
    }

    const newHash = await hashPassword(newPassword);

    await pool.query(
      `UPDATE account SET password = $1 WHERE "userId" = $2 AND "providerId" = 'credential'`,
      [newHash, user_id]
    );

    return res.status(200).json({ message: "Password changed successfully." });

  } catch (err) {
    console.error("changePassword error:", err.message);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to change password.",
    });
  }
};

// ─── Add Focus Score ──────────────────────────────────────────────────────────

/**
 * Increments the authenticated user's focus_score by the given number of points.
 *
 * @route POST /api/users/me/score
 */
const addScore = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { points } = req.body;

    if (!points || typeof points !== "number" || points <= 0) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "points must be a positive number.",
      });
    }

    const result = await pool.query(
      `UPDATE users SET focus_score = COALESCE(focus_score, 0) + $1
       WHERE user_id = $2
       RETURNING focus_score`,
      [points, user_id]
    );

    return res.status(200).json({ focus_score: result.rows[0].focus_score });
  } catch (err) {
    console.error("addScore error:", err.message);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to update focus score.",
    });
  }
};

module.exports = { getMe, updateMe, changePassword, nukeAccount, exportData, addScore };
