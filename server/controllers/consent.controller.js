const pool = require("../config/db");

/**
 * Records initial registration consent (core + optional AI/Spotify) and writes one
 * audit row per toggle to consent_audit_log (GDPR Art. 7(1)).
 *
 * @route POST /api/auth/consent
 * Body: { user_id?: uuid, is_consented_core: boolean, is_consented_ai: boolean, is_consented_spotify: boolean, policy_version?: string }
 */
const recordInitialConsent = async (req, res) => {
    try {
        const { user_id } = req.user;
        if (user_id == null || String(user_id).trim() === "" || String(user_id) === "undefined") {
            return res.status(400).json({
                error: "BAD_SESSION",
                message: "Session is missing a user id. Try signing in again.",
            });
        }
        const {
            user_id: bodyUserId,
            is_consented_core,
            is_consented_ai = false,
            is_consented_spotify = false,
            policy_version = "1.0",
        } = req.body || {};

        if (bodyUserId && bodyUserId !== user_id) {
            return res.status(403).json({
                error: "FORBIDDEN",
                message: "user_id does not match the authenticated session.",
            });
        }

        if (is_consented_core !== true) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "Core data consent is required to use FocusNest.",
            });
        }

        const ip_address = req.ip || req.connection?.remoteAddress || null;
        const sessionUserId = String(user_id);

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // Single upsert from Better Auth "user" row — avoids races with databaseHooks
            // and fixes UPDATE users … WHERE user_id matching 0 rows.
            const merged = await client.query(
                `INSERT INTO users (user_id, full_name, date_of_birth, is_consented_core, is_consented_ai, is_consented_spotify, is_admin)
                 SELECT
                   (u.id)::uuid,
                   LEFT(
                     COALESCE(
                       NULLIF(BTRIM(u.full_name), ''),
                       NULLIF(BTRIM(u.name), ''),
                       SPLIT_PART(u.email, '@', 1),
                       'User'
                     ),
                     100
                   )::varchar(100),
                   CASE
                     WHEN COALESCE(BTRIM(u.date_of_birth), '') <> ''
                     THEN BTRIM(u.date_of_birth)::date
                     ELSE DATE '2000-01-01'
                   END,
                   TRUE,
                   $1::boolean,
                   $2::boolean,
                   COALESCE(u.is_admin, FALSE)
                 FROM "user" AS u
                 WHERE u.id = $3
                 ON CONFLICT (user_id) DO UPDATE SET
                   is_consented_core = TRUE,
                   is_consented_ai = EXCLUDED.is_consented_ai,
                   is_consented_spotify = EXCLUDED.is_consented_spotify
                 RETURNING user_id`,
                [!!is_consented_ai, !!is_consented_spotify, sessionUserId]
            );

            if (merged.rows.length === 0) {
                await client.query("ROLLBACK");
                console.warn(
                    "recordInitialConsent: no Better Auth \"user\" row for session id",
                    String(sessionUserId).slice(0, 8) + "…"
                );
                return res.status(404).json({
                    error: "NOT_FOUND",
                    message:
                        "No Better Auth user row matched this session yet; wait a second and retry or sign in. If it keeps failing, confirm the database has the Better Auth \"user\" table (see server migrations).",
                });
            }

            await client.query(
                `UPDATE "user"
                 SET is_consented_ai = $1,
                     is_consented_spotify = $2
                 WHERE id = $3`,
                [!!is_consented_ai, !!is_consented_spotify, sessionUserId]
            );

            const audits = [
                ["core", true],
                ["ai", !!is_consented_ai],
                ["spotify", !!is_consented_spotify],
            ];

            for (const [consent_type, consent_value] of audits) {
                await client.query(
                    `INSERT INTO consent_audit_log (user_id, policy_version, consent_type, consent_value, ip_address)
                     VALUES ($1, $2, $3::consent_category, $4, $5)`,
                    [user_id, String(policy_version), consent_type, consent_value, ip_address]
                );
            }

            await client.query("COMMIT");

            const result = await pool.query(
                `SELECT user_id, is_consented_core, is_consented_ai, is_consented_spotify FROM users WHERE user_id = $1`,
                [user_id]
            );
            const row = result.rows[0];
            return res.status(201).json(row || { user_id, is_consented_core: true, is_consented_ai: !!is_consented_ai, is_consented_spotify: !!is_consented_spotify });
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("recordInitialConsent error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to record consent" });
    }
};

/**
 * Updates a user's consent preferences (AI and Spotify integrations)
 * and logs the action into the consent audit table inside a transaction.
 * 
 * @route PATCH /api/consent
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateConsent = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { is_consented_ai, is_consented_spotify, policy_version = "1.0" } = req.body;
        const ip_address = req.ip || req.connection.remoteAddress;

        if (is_consented_ai === undefined && is_consented_spotify === undefined) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "No consent fields provided to update." });
        }

        // Start transaction
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            const fields = [];
            const values = [];
            let index = 1;

            if (is_consented_ai !== undefined) {
                fields.push(`is_consented_ai = $${index++}`);
                values.push(is_consented_ai);
            }
            if (is_consented_spotify !== undefined) {
                fields.push(`is_consented_spotify = $${index++}`);
                values.push(is_consented_spotify);
            }

            values.push(user_id);

            // Update user consent
            const updateResult = await client.query(
                `UPDATE users SET ${fields.join(", ")}
                 WHERE user_id = $${index}
                 RETURNING *`,
                values
            );

            // Log audits
            if (is_consented_ai !== undefined) {
                await client.query(
                    `INSERT INTO consent_audit_log (user_id, policy_version, consent_type, consent_value, ip_address)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [user_id, policy_version, "ai", is_consented_ai, ip_address]
                );
            }

            if (is_consented_spotify !== undefined) {
                await client.query(
                    `INSERT INTO consent_audit_log (user_id, policy_version, consent_type, consent_value, ip_address)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [user_id, policy_version, "spotify", is_consented_spotify, ip_address]
                );
            }

            await client.query("COMMIT");

            const updatedUser = updateResult.rows[0];
            return res.status(200).json(updatedUser);
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("updateConsent error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to update consent" });
    }
};

/**
 * Retrieves the full consent history of a specific user for audit purposes.
 * 
 * @route GET /api/consent/history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getConsentHistory = async (req, res) => {
    try {
        const { user_id } = req.user;

        const result = await pool.query(
            `SELECT * FROM consent_audit_log WHERE user_id = $1 ORDER BY consented_at DESC`,
            [user_id]
        );

        return res.status(200).json(result.rows);
    } catch (err) {
        console.error("getConsentHistory error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to get consent history" });
    }
};

module.exports = { recordInitialConsent, updateConsent, getConsentHistory };
