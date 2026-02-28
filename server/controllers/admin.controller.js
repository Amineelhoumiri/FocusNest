const pool = require("../config/db");

/**
 * Retrieves all rows from the openai_usage table and masks content-related fields.
 * Used by administrators to view system usage statistics.
 * 
 * @route GET /api/admin/usage
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUsage = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM openai_usage ORDER BY id DESC`
        );

        const usageLogs = result.rows.map((row) => {
            // "masking any content fields"
            const maskedRow = { ...row };

            // Just in case these exist in the output despite not being in schema
            if (maskedRow.prompt) maskedRow.prompt = "***MASKED***";
            if (maskedRow.completion) maskedRow.completion = "***MASKED***";
            if (maskedRow.content) maskedRow.content = "***MASKED***";

            return maskedRow;
        });

        return res.status(200).json(usageLogs);
    } catch (err) {
        console.error("getUsage error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to get usage" });
    }
};

/**
 * Retrieves all system prompts from the database.
 * 
 * @route GET /api/admin/prompts
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSystemPrompts = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM system_prompts ORDER BY key ASC`
        );

        return res.status(200).json(result.rows);
    } catch (err) {
        console.error("getSystemPrompts error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to get system prompts" });
    }
};

/**
 * Updates an existing system prompt in the database.
 * 
 * @route PATCH /api/admin/prompts/:key
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateSystemPrompt = async (req, res) => {
    try {
        const { key } = req.params;
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "prompt is required." });
        }

        const result = await pool.query(
            `UPDATE system_prompts SET prompt = $1 WHERE key = $2 RETURNING *`,
            [prompt, key]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "NOT_FOUND", message: "Prompt key not found." });
        }

        return res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error("updateSystemPrompt error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to update system prompt" });
    }
};

/**
 * Deletes a system prompt from the database.
 * 
 * @route DELETE /api/admin/prompts/:key
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteSystemPrompt = async (req, res) => {
    try {
        const { key } = req.params;

        const result = await pool.query(
            `DELETE FROM system_prompts WHERE key = $1 RETURNING *`,
            [key]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "NOT_FOUND", message: "Prompt key not found." });
        }

        return res.status(204).send();
    } catch (err) {
        console.error("deleteSystemPrompt error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to delete system prompt" });
    }
};

module.exports = { getUsage, getSystemPrompts, updateSystemPrompt, deleteSystemPrompt };
