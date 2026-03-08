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
 * Aggregates token usage from chat_messages table.
 * Returns total tokens, message counts, and a daily breakdown.
 *
 * @route GET /api/admin/chat-tokens
 */
const getChatTokenStats = async (req, res) => {
    try {
        const [summaryResult, dailyResult] = await Promise.all([
            pool.query(`
                SELECT
                    COUNT(*)                                        AS total_messages,
                    COALESCE(SUM(cm.token_count), 0)               AS total_tokens,
                    COALESCE(SUM(cm.token_count) FILTER (WHERE cm.role = 'user'),      0) AS user_tokens,
                    COALESCE(SUM(cm.token_count) FILTER (WHERE cm.role = 'assistant'), 0) AS assistant_tokens,
                    COUNT(DISTINCT cs.user_id)                     AS unique_users
                FROM chat_messages cm
                JOIN chat_sessions cs ON cm.chat_session_id = cs.chat_session_id
            `),
            pool.query(`
                SELECT
                    DATE(cm.created_at)                  AS date,
                    COALESCE(SUM(cm.token_count), 0)     AS tokens,
                    COUNT(*)                             AS messages
                FROM chat_messages cm
                GROUP BY DATE(cm.created_at)
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

module.exports = { getUsage, getChatTokenStats, getSystemPrompts, updateSystemPrompt, deleteSystemPrompt };
