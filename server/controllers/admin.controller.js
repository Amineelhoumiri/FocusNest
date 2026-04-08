const pool = require("../config/db");
const path = require("path");
const fs = require("fs");

// Load pricing from docs/token_costs.json
const tokenCosts = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../docs/token_costs.json"), "utf8")
);

// Model name → USD pricing per 1M tokens
const MODEL_PRICING = {
    "gpt-5.2":             { input: 1.25,  output: 10.00 }, // same tier as gpt-5
    "gpt-4-turbo-preview": { input: 10.00, output: 30.00 },
    "gpt-4o":              { input: tokenCosts.pricing_usd.gpt_4_series.gpt_4o.input,       output: tokenCosts.pricing_usd.gpt_4_series.gpt_4o.output },
    "gpt-4o-mini":         { input: tokenCosts.pricing_usd.gpt_4_series.gpt_4o_mini.input,  output: tokenCosts.pricing_usd.gpt_4_series.gpt_4o_mini.output },
    "gpt-4.1":             { input: tokenCosts.pricing_usd.gpt_4_series["gpt_4.1"].input,   output: tokenCosts.pricing_usd.gpt_4_series["gpt_4.1"].output },
    "gpt-4.1-mini":        { input: tokenCosts.pricing_usd.gpt_4_series["gpt_4.1_mini"].input, output: tokenCosts.pricing_usd.gpt_4_series["gpt_4.1_mini"].output },
    "gpt-5":               { input: tokenCosts.pricing_usd.gpt_5_series.gpt_5.input,        output: tokenCosts.pricing_usd.gpt_5_series.gpt_5.output },
    "gpt-5-mini":          { input: tokenCosts.pricing_usd.gpt_5_series.gpt_5_mini.input,   output: tokenCosts.pricing_usd.gpt_5_series.gpt_5_mini.output },
};

/**
 * Calculate USD cost for a given model and token counts.
 * Prices in the JSON are per 1M tokens.
 */
function calcCost(model, promptTokens, completionTokens) {
    const pricing = MODEL_PRICING[model] ?? MODEL_PRICING["gpt-4-turbo-preview"];
    const inputCost  = (promptTokens     / 1_000_000) * pricing.input;
    const outputCost = (completionTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
}

/**
 * Retrieves all rows from openai_usage with real-time cost calculation
 * based on model pricing from token_costs.json.
 *
 * @route GET /api/admin/usage
 */
const getUsage = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, user_id, model, prompt_tokens, completion_tokens, total_tokens, created_at
             FROM openai_usage
             ORDER BY id DESC`
        );

        const usageLogs = result.rows.map((row) => ({
            ...row,
            cost: calcCost(row.model, row.prompt_tokens || 0, row.completion_tokens || 0),
        }));

        return res.status(200).json(usageLogs);
    } catch (err) {
        console.error("getUsage error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to get usage" });
    }
};

/**
 * Aggregates AI token usage across conversations.
 *
 * NOTE: We intentionally use `openai_usage` rather than `chat_messages.token_count`.
 * In practice, chat message insertion doesn't always include accurate token counts,
 * while OpenAI returns authoritative usage totals per request.
 *
 * We map:
 * - prompt_tokens    → "user_tokens" (input side)
 * - completion_tokens → "assistant_tokens" (output side)
 * - total_tokens     → total
 *
 * @route GET /api/admin/chat-tokens
 */
const getChatTokenStats = async (req, res) => {
    try {
        const [summaryResult, dailyResult] = await Promise.all([
            pool.query(`
                SELECT
                    COUNT(*)                               AS total_messages,
                    COALESCE(SUM(total_tokens), 0)         AS total_tokens,
                    COALESCE(SUM(prompt_tokens), 0)        AS user_tokens,
                    COALESCE(SUM(completion_tokens), 0)    AS assistant_tokens,
                    COUNT(DISTINCT user_id)                AS unique_users
                FROM openai_usage
            `),
            pool.query(`
                SELECT
                    DATE(created_at)               AS date,
                    COALESCE(SUM(total_tokens), 0) AS tokens,
                    COUNT(*)                       AS messages
                FROM openai_usage
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 30
            `),
        ]);

        return res.status(200).json({
            summary: summaryResult.rows[0],
            daily:   dailyResult.rows,
        });
    } catch (err) {
        console.error("getChatTokenStats error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to get chat token stats" });
    }
};

// Helper to validate UUID format (admin actions)
const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

/**
 * Admin-only: permanently delete a user account and all associated data.
 *
 * @route DELETE /api/admin/users/:user_id
 */
const deleteUserAccount = async (req, res) => {
    try {
        const { user_id } = req.params;
        const requesterId = req.user?.user_id;

        if (!user_id || !isValidUUID(user_id)) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "Valid user_id is required." });
        }
        if (requesterId && requesterId === user_id) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "Admins cannot delete their own account from this screen." });
        }

        // Delete from both tables — CASCADE handles children of each.
        // "user" is quoted because it is a PostgreSQL reserved keyword.
        await pool.query(`DELETE FROM users WHERE user_id = $1`, [user_id]);
        await pool.query(`DELETE FROM "user" WHERE id = $1`, [user_id]);

        return res.status(204).send();
    } catch (err) {
        console.error("deleteUserAccount error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to delete user account" });
    }
};

/**
 * Retrieves all system prompts from the database.
 *
 * @route GET /api/admin/prompts
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
 */
const updateSystemPrompt = async (req, res) => {
    try {
        const { key } = req.params;
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "prompt is required." });
        }

        const result = await pool.query(
            `UPDATE system_prompts SET prompt = $1, updated_at = NOW() WHERE key = $2 RETURNING *`,
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
 * Returns recent tasks and chat messages with content masked for privacy.
 * task_name and message content are KMS-encrypted BYTEA — never decrypted here.
 * Admins see metadata (timestamps, token counts, status) + a fixed mask placeholder.
 *
 * @route GET /api/admin/masked-activity
 */
const getMaskedActivity = async (req, res) => {
    try {
        const result = await pool.query(`
            WITH
            task_stats AS (
                SELECT
                    user_id,
                    COUNT(*)                                            AS total_tasks,
                    COUNT(*) FILTER (WHERE task_status = 'Done')       AS tasks_done,
                    MAX(updated_at)                                     AS last_task_at
                FROM tasks
                GROUP BY user_id
            ),
            chat_stats AS (
                SELECT
                    cs.user_id,
                    COUNT(cm.chat_message_id) FILTER (WHERE cm.role = 'user') AS messages_sent,
                    COUNT(cm.chat_message_id)                                  AS total_messages,
                    MAX(cm.created_at)                                         AS last_chat_at
                FROM chat_sessions cs
                LEFT JOIN chat_messages cm ON cm.chat_session_id = cs.chat_session_id
                GROUP BY cs.user_id
            ),
            token_stats AS (
                SELECT
                    user_id,
                    COALESCE(SUM(total_tokens), 0)      AS tokens_consumed,
                    COUNT(*)                             AS ai_calls
                FROM openai_usage
                GROUP BY user_id
            ),
            session_stats AS (
                SELECT
                    user_id,
                    COUNT(*)                             AS total_sessions,
                    MAX(start_time)                      AS last_session_at
                FROM focus_session
                GROUP BY user_id
            )
            SELECT
                u.user_id,
                u.full_name,
                u.created_at                         AS joined_at,
                u.last_login_at,
                u.focus_score,
                u.is_consented_ai,
                u.is_consented_spotify,
                COALESCE(t.total_tasks, 0)           AS total_tasks,
                COALESCE(t.tasks_done, 0)            AS tasks_done,
                COALESCE(c.messages_sent, 0)         AS messages_sent,
                COALESCE(c.total_messages, 0)        AS total_messages,
                COALESCE(tk.tokens_consumed, 0)      AS tokens_consumed,
                COALESCE(tk.ai_calls, 0)             AS ai_calls,
                COALESCE(s.total_sessions, 0)        AS total_sessions,
                GREATEST(t.last_task_at, c.last_chat_at, s.last_session_at) AS last_active_at
            FROM users u
            LEFT JOIN task_stats    t  ON t.user_id  = u.user_id
            LEFT JOIN chat_stats    c  ON c.user_id  = u.user_id
            LEFT JOIN token_stats   tk ON tk.user_id = u.user_id
            LEFT JOIN session_stats s  ON s.user_id  = u.user_id
            ORDER BY last_active_at DESC NULLS LAST
        `);

        return res.status(200).json({ users: result.rows });
    } catch (err) {
        console.error("getMaskedActivity error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to get masked activity" });
    }
};

/**
 * Creates a new system prompt in the database.
 *
 * @route POST /api/admin/prompts
 */
const createSystemPrompt = async (req, res) => {
    try {
        const { key, prompt } = req.body;

        if (!key || !prompt) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "key and prompt are required." });
        }

        // Validate key format: lowercase alphanumeric + underscores only
        if (!/^[a-z0-9_]+$/.test(key)) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "key must be lowercase alphanumeric with underscores only." });
        }

        const result = await pool.query(
            `INSERT INTO system_prompts (key, prompt) VALUES ($1, $2) RETURNING *`,
            [key, prompt]
        );

        return res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({ error: "CONFLICT", message: "A prompt with this key already exists." });
        }
        console.error("createSystemPrompt error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to create system prompt" });
    }
};

/**
 * Deletes a system prompt from the database.
 *
 * @route DELETE /api/admin/prompts/:key
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

module.exports = { getUsage, getChatTokenStats, getMaskedActivity, getSystemPrompts, createSystemPrompt, updateSystemPrompt, deleteSystemPrompt, deleteUserAccount };
