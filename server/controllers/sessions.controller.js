const pool = require("../config/db");
const { encrypt } = require("../services/encryption.service");
const posthog = require("../posthog");

// Helper to validate UUID format
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Starts a new focus session for the user on a specific task.
 * @route POST /api/sessions
 */
const startSession = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { task_id } = req.body;

    if (!task_id || !isValidUUID(task_id)) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "Valid task_id is required." });
    }

    const active = await pool.query(
      `SELECT session_id, task_id FROM focus_session WHERE user_id = $1 AND is_active = TRUE LIMIT 1`,
      [user_id]
    );
    if (active.rows.length > 0) {
      return res.status(409).json({
        error: "SESSION_ACTIVE",
        message: "You already have an active focus session. Finish or end it before starting another.",
        active_session_id: active.rows[0].session_id,
        active_task_id: active.rows[0].task_id,
      });
    }

    const result = await pool.query(
      `INSERT INTO focus_session (user_id, task_id, is_active)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, task_id, true]
    );

    const session = result.rows[0];

    posthog.capture({
      distinctId: String(user_id),
      event: "focus_session_started",
      properties: {
        session_id: session.session_id,
        task_id: task_id,
      },
    });

    return res.status(201).json(session);
  } catch (err) {
    console.error("startSession error:", err.message);
    posthog.captureException(err, String(req.user?.user_id));
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to start session" });
  }
};

/**
 * Retrieves the user's history of focus sessions, ordered by the most recent.
 * @route GET /api/sessions
 */
const getSessions = async (req, res) => {
  try {
    const { user_id } = req.user;

    const result = await pool.query(
      `SELECT * FROM focus_session WHERE user_id = $1 ORDER BY start_time DESC`,
      [user_id]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("getSessions error:", err.message);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to get sessions" });
  }
};

/**
 * Ends an active focus session.
 * @route PATCH /api/sessions/:session_id
 */
const endSession = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { session_id } = req.params;
    const { outcome, reflection_type, reflection_content } = req.body;

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

    if (reflection_content !== undefined && reflection_content !== null) {
      const text = typeof reflection_content === "string" ? reflection_content.trim() : "";
      if (text.length > 0) {
        fields.push(`reflection_content = $${index++}`);
        values.push(await encrypt(text));
      }
    }

    values.push(session_id);
    values.push(user_id);

    const result = await pool.query(
      `UPDATE focus_session SET ${fields.join(", ")}
       WHERE session_id = $${index} AND user_id = $${index + 1} AND is_active = TRUE
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Active session not found or already ended." });
    }

    const endedSession = result.rows[0];

    posthog.capture({
      distinctId: String(user_id),
      event: "focus_session_ended",
      properties: {
        session_id: session_id,
        task_id: endedSession.task_id,
        outcome: outcome || null,
        reflection_type: reflection_type || null,
      },
    });

    return res.status(200).json(endedSession);
  } catch (err) {
    console.error("endSession error:", err.message);
    posthog.captureException(err, String(req.user?.user_id));
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to end session" });
  }
};

/**
 * Switches the task associated with the currently running active session.
 * @route POST /api/sessions/:session_id/switch
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
      `UPDATE focus_session SET task_id = $1
       WHERE session_id = $2 AND user_id = $3 AND is_active = TRUE
       RETURNING *`,
      [new_task_id, session_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Active session not found." });
    }

    posthog.capture({
      distinctId: String(user_id),
      event: "focus_session_task_switched",
      properties: {
        session_id: session_id,
        new_task_id: new_task_id,
      },
    });

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("switchSession error:", err.message);
    posthog.captureException(err, String(req.user?.user_id));
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to switch session" });
  }
};

module.exports = { startSession, getSessions, endSession, switchSession };
