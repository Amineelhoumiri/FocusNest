// controllers/subtasks.controller.js
// Handles all subtask operations.
// Key rules from SRS:
// - FR-C-03: AI generated subtasks land with is_approved = FALSE
// - Approving a subtask (is_approved = TRUE) promotes it to the Kanban board
// - subtask_name is encrypted (BYTEA) before storing

const pool = require("../config/db");
const { encrypt, decrypt } = require("../services/encryption.service");
const { generateTaskBreakdown } = require("../services/ai.service");

// ─── Helper: validate UUID format ─────────────────────────────────────────────
const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;  // UUID regex
    return uuidRegex.test(uuid);
};

// ─── Get All Subtasks for a Task ──────────────────────────────────────────────

/**
 * Retrieves all subtasks nested underneath a specific task ID.
 * Decrypts `subtask_name` automatically.
 * 
 * @route GET /api/tasks/:task_id/subtasks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSubtasks = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { task_id } = req.params;

        if (!isValidUUID(task_id)) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "Invalid task_id format.",
            });
        }

        // Verify task belongs to user
        const taskCheck = await pool.query(
            `SELECT task_id FROM tasks WHERE task_id = $1 AND user_id = $2`,
            [task_id, user_id]
        );

        if (taskCheck.rows.length === 0) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Task not found.",
            });
        }

        const result = await pool.query(
            `SELECT subtask_id, subtask_name, subtask_status, energy_level, is_approved, created_at, updated_at
       FROM subtasks
       WHERE task_id = $1
       ORDER BY created_at ASC`,
            [task_id]
        );

        const subtasks = await Promise.all(result.rows.map(async (row) => ({
            ...row,
            subtask_name: await decrypt(row.subtask_name.toString()),
        })));

        return res.status(200).json(subtasks);

    } catch (err) {
        console.error("getSubtasks error:", err.message);
        return res.status(500).json({
            error: "INTERNAL_SERVER_ERROR",
            message: "Failed to get subtasks.",
        });
    }
};

// ─── Get Single Subtask ───────────────────────────────────────────────────────

/**
 * Retrieves a single specific subtask using both its own ID and its parent's task_id,
 * ensuring strict ownership and validity.
 * 
 * @route GET /api/tasks/:task_id/subtasks/:subtask_id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSubtask = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { task_id, subtask_id } = req.params;

        // Verify task belongs to user
        const taskCheck = await pool.query(
            `SELECT task_id FROM tasks WHERE task_id = $1 AND user_id = $2`,
            [task_id, user_id]
        );

        if (taskCheck.rows.length === 0) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Task not found.",
            });
        }

        const result = await pool.query(
            `SELECT subtask_id, subtask_name, subtask_status, energy_level, is_approved, created_at, updated_at
       FROM subtasks
       WHERE subtask_id = $1 AND task_id = $2`,
            [subtask_id, task_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Subtask not found.",
            });
        }

        const subtask = result.rows[0];
        subtask.subtask_name = await decrypt(subtask.subtask_name.toString());

        return res.status(200).json(subtask);

    } catch (err) {
        console.error("getSubtask error:", err.message);
        return res.status(500).json({
            error: "INTERNAL_SERVER_ERROR",
            message: "Failed to get subtask.",
        });
    }
};

// ─── Create Subtask ───────────────────────────────────────────────────────────

/**
 * Creates a new subtask beneath a specific parent task. 
 * AI generated subtasks will default to `is_approved = FALSE` allowing Kanban promotion logic.
 * Encrypts `subtask_name` as BYTEA securely.
 * 
 * @route POST /api/tasks/:task_id/subtasks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createSubtask = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { task_id } = req.params;
        const { subtask_name, energy_level, is_approved = false } = req.body;

        // Validate required fields
        if (!subtask_name || !energy_level) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "subtask_name and energy_level are required.",
            });
        }

        if (!["Low", "High"].includes(energy_level)) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "energy_level must be 'Low' or 'High'.",
            });
        }

        // Verify task belongs to user
        const taskCheck = await pool.query(
            `SELECT task_id FROM tasks WHERE task_id = $1 AND user_id = $2`,
            [task_id, user_id]
        );

        if (taskCheck.rows.length === 0) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Task not found.",
            });
        }

        const encryptedName = await encrypt(subtask_name);

        const result = await pool.query(
            `INSERT INTO subtasks (task_id, subtask_name, subtask_status, energy_level, is_approved)
       VALUES ($1, $2, 'Backlog', $3, $4)
       RETURNING subtask_id, subtask_status, energy_level, is_approved, created_at`,
            [task_id, Buffer.from(encryptedName), energy_level, is_approved]
        );

        return res.status(201).json({
            ...result.rows[0],
            subtask_name, // return plaintext to client
        });

    } catch (err) {
        console.error("createSubtask error:", err.message);
        return res.status(500).json({
            error: "INTERNAL_SERVER_ERROR",
            message: "Failed to create subtask.",
        });
    }
};

// ─── Update Subtask ───────────────────────────────────────────────────────────

/**
 * Partially updates an existing subtask dynamically.
 * Promoting `is_approved` to true will move it onto the primary task board conceptually.
 * Also enforces the rule that only a single subtask can be in the 'Doing' status at a time.
 * 
 * @route PATCH /api/tasks/:task_id/subtasks/:subtask_id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateSubtask = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { task_id, subtask_id } = req.params;
        const { subtask_name, subtask_status, energy_level, is_approved } = req.body;

        // Verify task belongs to user
        const taskCheck = await pool.query(
            `SELECT task_id FROM tasks WHERE task_id = $1 AND user_id = $2`,
            [task_id, user_id]
        );

        if (taskCheck.rows.length === 0) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Task not found.",
            });
        }

        // Build dynamic update query
        const fields = [];
        const values = [];
        let index = 1;

        if (subtask_name !== undefined) {
            fields.push(`subtask_name = $${index++}`);
            values.push(Buffer.from(await encrypt(subtask_name)));
        }
        if (subtask_status !== undefined) {
            fields.push(`subtask_status = $${index++}`);
            values.push(subtask_status);
        }
        if (energy_level !== undefined) {
            fields.push(`energy_level = $${index++}`);
            values.push(energy_level);
        }
        if (is_approved !== undefined) {
            fields.push(`is_approved = $${index++}`);
            values.push(is_approved);
        }

        if (fields.length === 0) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "No fields provided to update.",
            });
        }

        // Single subtask enforcement within a task
        if (subtask_status === "Doing") {
            const doingSubtask = await pool.query(
                `SELECT subtask_id FROM subtasks 
       WHERE task_id = $1 AND subtask_status = 'Doing' AND subtask_id != $2`,
                [task_id, subtask_id]
            );

            if (doingSubtask.rows.length > 0) {
                return res.status(409).json({
                    error: "SINGLE_SUBTASK_VIOLATION",
                    message: "You already have a subtask in progress. Complete it before starting another.",
                });
            }
        }

        fields.push(`updated_at = NOW()`);
        values.push(subtask_id, task_id);

        const result = await pool.query(
            `UPDATE subtasks SET ${fields.join(", ")}
       WHERE subtask_id = $${index} AND task_id = $${index + 1}
       RETURNING subtask_id, subtask_status, energy_level, is_approved, updated_at`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Subtask not found.",
            });
        }

        return res.status(200).json({
            ...result.rows[0],
            subtask_name: subtask_name || undefined,
        });

    } catch (err) {
        console.error("updateSubtask error:", err.message);
        return res.status(500).json({
            error: "INTERNAL_SERVER_ERROR",
            message: "Failed to update subtask.",
        });
    }
};

// ─── Delete Subtask ───────────────────────────────────────────────────────────

/**
 * Hard-deletes a subtask off of its parent task.
 * 
 * @route DELETE /api/tasks/:task_id/subtasks/:subtask_id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteSubtask = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { task_id, subtask_id } = req.params;

        // Verify task belongs to user
        const taskCheck = await pool.query(
            `SELECT task_id FROM tasks WHERE task_id = $1 AND user_id = $2`,
            [task_id, user_id]
        );

        if (taskCheck.rows.length === 0) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Task not found.",
            });
        }

        const result = await pool.query(
            `DELETE FROM subtasks WHERE subtask_id = $1 AND task_id = $2
       RETURNING subtask_id`,
            [subtask_id, task_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Subtask not found.",
            });
        }

        return res.status(204).send();

    } catch (err) {
        console.error("deleteSubtask error:", err.message);
        return res.status(500).json({
            error: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete subtask.",
        });
    }
};

// ─── Generate Subtasks via AI ─────────────────────────────────────────────────

/**
 * Calls the AI task breakdown service and saves the generated subtasks
 * with is_approved = false so the user can review and approve them.
 *
 * @route POST /api/tasks/:task_id/subtasks/generate
 */
const generateSubtasks = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { task_id } = req.params;

        if (!isValidUUID(task_id)) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid task_id format." });
        }

        // Verify task belongs to user and get task name for the AI prompt
        const taskResult = await pool.query(
            `SELECT task_name FROM tasks WHERE task_id = $1 AND user_id = $2`,
            [task_id, user_id]
        );

        if (taskResult.rows.length === 0) {
            return res.status(404).json({ error: "NOT_FOUND", message: "Task not found." });
        }

        const taskName = await decrypt(taskResult.rows[0].task_name.toString());

        // Call AI to break down the task
        const aiResult = await generateTaskBreakdown(taskName, user_id);

        if (!aiResult || !Array.isArray(aiResult.subtasks)) {
            return res.status(500).json({ error: "AI_ERROR", message: "AI did not return valid subtasks." });
        }

        // Save each generated subtask with is_approved = false
        const created = await Promise.all(
            aiResult.subtasks.map(async (st) => {
                const encryptedName = await encrypt(st.subtask_name);
                const result = await pool.query(
                    `INSERT INTO subtasks (task_id, subtask_name, energy_level, is_approved)
                     VALUES ($1, $2, $3, FALSE)
                     RETURNING *`,
                    [task_id, encryptedName, st.energy_level || "Low"]
                );
                const row = result.rows[0];
                row.subtask_name = await decrypt(row.subtask_name.toString());
                return row;
            })
        );

        return res.status(201).json({
            chat_opening: aiResult.chat_opening || null,
            chat_closing: aiResult.chat_closing || null,
            subtasks: created,
        });
    } catch (err) {
        console.error("generateSubtasks error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to generate subtasks." });
    }
};

module.exports = { getSubtasks, getSubtask, createSubtask, updateSubtask, deleteSubtask, generateSubtasks };