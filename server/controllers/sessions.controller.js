const pool = require("../config/db");

// Helper to validate UUID format
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Starts a new focus session for the user on a specific task.
 * Sets the `is_active` flag to true.
 * 
 * @route POST /api/sessions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const startSession = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { task_id } = req.body;

    if (!task_id || !isValidUUID(task_id)) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "Valid task_id is required." });
    }

    // In a complete implementation, you'd likely want to enforce one active session at a time
    // but simple creation fits the pattern here.
    const result = await pool.query(
      `INSERT INTO session (user_id, task_id, is_active)
             VALUES ($1, $2, $3)
             RETURNING *`,
      [user_id, task_id, true]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("startSession error:", err.message);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to start session" });
  }
};

/**
 * Retrieves the user's history of focus sessions, ordered by the most recent.
 * 
 * @route GET /api/sessions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSessions = async (req, res) => {
  try {
    const { user_id } = req.user;

    const result = await pool.query(
      `SELECT * FROM session WHERE user_id = $1 ORDER BY start_time DESC`,
      [user_id]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("getSessions error:", err.message);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to get sessions" });
  }
};

/**
 * Ends an active focus session. Sets `is_active` to false, calculates `end_time`,
 * and records optional reflection metrics like outcome and reflection_type.
 * 
 * @route PATCH /api/sessions/:session_id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const endSession = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { session_id } = req.params;
    const { outcome, reflection_type } = req.body;

    if (!isValidUUID(session_id)) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid session_id format." });
    }

    const fields = [];
    const values = [];
    let index = 1;

    fields.push(`is_active = $${index++}`);
    values.push(false);

    fields.push(`end_time = CURRENT_TIMESTAMP`);

    if (outcome !== undefined) {
      fields.push(`outcome = $${index++}`);
      values.push(outcome);
    }

    if (reflection_type !== undefined) {
      fields.push(`reflection_type = $${index++}`);
      values.push(reflection_type);
    }

    values.push(session_id);
    values.push(user_id);

    const result = await pool.query(
      `UPDATE session SET ${fields.join(", ")}
             WHERE session_id = $${index} AND user_id = $${index + 1} AND is_active = TRUE
             RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Active session not found or already ended." });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("endSession error:", err.message);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to end session" });
  }
};

/**
 * Switches the task associated with the currently running active session.
 * Allows users to change tasks without needing to restart their focus clock.
 * 
 * @route POST /api/sessions/:session_id/switch
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const switchSession = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { session_id } = req.params;
    const { new_task_id } = req.body;

    if (!isValidUUID(session_id)) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid session_id format." });
    }

    if (!new_task_id || !isValidUUID(new_task_id)) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "Valid new_task_id is required." });
    }

    const result = await pool.query(
      `UPDATE session SET task_id = $1
             WHERE session_id = $2 AND user_id = $3 AND is_active = TRUE
             RETURNING *`,
      [new_task_id, session_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Active session not found." });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("switchSession error:", err.message);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to switch session" });
  }
};

module.exports = { startSession, getSessions, endSession, switchSession };
