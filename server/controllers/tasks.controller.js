const pool = require("../config/db");
const { encrypt, decrypt } = require("../services/encryption.service");

// Helper to validate UUID format
const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

/**
 * Retrieves all tasks for the currently authenticated user.
 * Task names are automatically decrypted before being returned to the client.
 * 
 * @route GET /api/tasks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTasks = async (req, res) => {
    try {
        const { user_id } = req.user;
        const result = await pool.query(
            `SELECT t.*, 
                    CAST(COUNT(s.subtask_id) AS INTEGER) as total_subtasks,
                    CAST(COUNT(s.subtask_id) FILTER (WHERE s.subtask_status = 'Done') AS INTEGER) as completed_subtasks
             FROM tasks t
             LEFT JOIN subtasks s ON t.task_id = s.task_id
             WHERE t.user_id = $1 
             GROUP BY t.task_id
             ORDER BY t.created_at DESC`,
            [user_id]
        );

        const tasks = await Promise.all(result.rows.map(async (row) => ({
            ...row,
            task_name: await decrypt(row.task_name.toString()), // decrypt the task_name
        })));

        return res.status(200).json(tasks);
    } catch (err) {
        console.error("getTasks error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to get tasks" });
    }
};

/**
 * Retrieves a specific task securely ensuring it belongs to the authenticated user.
 * The task name is decrypted before returning.
 * 
 * @route GET /api/tasks/:task_id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTask = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { task_id } = req.params;

        if (!isValidUUID(task_id)) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid task_id format." });
        }

        const result = await pool.query(
            `SELECT * FROM tasks WHERE task_id = $1 AND user_id = $2`,
            [task_id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "NOT_FOUND", message: "Task not found." });
        }

        const task = result.rows[0];
        task.task_name = await decrypt(task.task_name.toString());

        return res.status(200).json(task);
    } catch (err) {
        console.error("getTask error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to get task" });
    }
};

/**
 * Creates a new task. The `task_name` is encrypted (BYTEA) before it reaches the database.
 * Also enforces that a user can only have one task in the 'Doing' status at a time.
 * 
 * @route POST /api/tasks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createTask = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { task_name, task_status = "Backlog", energy_level } = req.body;

        if (!task_name || !energy_level) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "task_name and energy_level are required." });
        }

        if (task_status === "Doing") {
            const existingDoing = await pool.query(
                `SELECT task_id FROM tasks WHERE user_id = $1 AND task_status = 'Doing'`,
                [user_id]
            );
            if (existingDoing.rows.length > 0) {
                return res.status(400).json({ error: "VALIDATION_ERROR", message: "Only one task can be in the 'Doing' status at a time." });
            }
        }

        const encryptedTaskName = await encrypt(task_name);

        const result = await pool.query(
            `INSERT INTO tasks (user_id, task_name, task_status, energy_level)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [user_id, encryptedTaskName, task_status, energy_level]
        );

        const newTask = result.rows[0];
        newTask.task_name = await decrypt(newTask.task_name.toString());

        return res.status(201).json(newTask);
    } catch (err) {
        console.error("createTask error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to create task" });
    }
};

/**
 * Partially updates an existing task. Handles dynamic updating of multiple fields.
 * Encrypts `task_name` if it is being updated, and enforces the single 'Doing' task rule.
 * 
 * @route PATCH /api/tasks/:task_id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateTask = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { task_id } = req.params;
        const { task_name, task_status, energy_level, notes, due_date } = req.body;

        if (!isValidUUID(task_id)) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid task_id format." });
        }

        if (task_status === "Doing") {
            const existingDoing = await pool.query(
                `SELECT task_id FROM tasks WHERE user_id = $1 AND task_status = 'Doing' AND task_id != $2`,
                [user_id, task_id]
            );
            if (existingDoing.rows.length > 0) {
                return res.status(400).json({ error: "VALIDATION_ERROR", message: "Only one task can be in the 'Doing' status at a time." });
            }
        }

        const fields = [];
        const values = [];
        let index = 1;

        if (task_name !== undefined) {
            fields.push(`task_name = $${index++}`);
            values.push(await encrypt(task_name));
        }
        if (task_status !== undefined) {
            fields.push(`task_status = $${index++}`);
            values.push(task_status);
        }
        if (energy_level !== undefined) {
            fields.push(`energy_level = $${index++}`);
            values.push(energy_level);
        }
        if (notes !== undefined) {
            fields.push(`notes = $${index++}`);
            values.push(notes);
        }
        if (due_date !== undefined) {
            fields.push(`due_date = $${index++}`);
            values.push(due_date ?? null);
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "No fields to update." });
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(task_id);
        values.push(user_id);

        const result = await pool.query(
            `UPDATE tasks SET ${fields.join(", ")}
       WHERE task_id = $${index} AND user_id = $${index + 1}
       RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "NOT_FOUND", message: "Task not found." });
        }

        const updatedTask = result.rows[0];
        updatedTask.task_name = await decrypt(updatedTask.task_name.toString());

        return res.status(200).json(updatedTask);
    } catch (err) {
        console.error("updateTask error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to update task" });
    }
};

/**
 * Deletes a task from the database.
 * 
 * @route DELETE /api/tasks/:task_id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteTask = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { task_id } = req.params;

        if (!isValidUUID(task_id)) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid task_id format." });
        }

        const result = await pool.query(
            `DELETE FROM tasks WHERE task_id = $1 AND user_id = $2 RETURNING *`,
            [task_id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "NOT_FOUND", message: "Task not found." });
        }

        return res.status(204).send();
    } catch (err) {
        console.error("deleteTask error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to delete task" });
    }
};

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask };
