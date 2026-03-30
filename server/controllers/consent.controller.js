const pool = require("../config/db");

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

module.exports = { updateConsent, getConsentHistory };
