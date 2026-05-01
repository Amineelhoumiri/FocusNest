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
 * Enforces the one-active-session constraint: returns 409 SESSION_ACTIVE if the user
 * already has an open session, including the conflicting IDs so the client can redirect.
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
      // Include IDs so the client can navigate to the existing session rather than showing a generic error
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
 * Retrieves the full focus session history for the current user, ordered most recent first.
 * Used by the Sessions page to display past sessions and their reflections.
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
 * Ends an active focus session, recording outcome and optional no-shame reflection.
 * All three reflection fields (outcome, reflection_type, reflection_content) are optional —
 * the UPDATE is built dynamically so only provided fields are written.
 * reflection_content is encrypted before storage (clinical free-text, AES-256-GCM via KMS).
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
        // Clinical free-text — encrypted at rest (AES-256-GCM, KMS-wrapped key). Skip blank submissions to avoid a needless KMS round-trip.
        fields.push(`reflection_content = $${index++}`);
        values.push(await encrypt(text));
      }
    }

    values.push(session_id);
    values.push(user_id);

    // AND is_active = TRUE prevents double-ending a session; 0 rows returned → 404
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
 * Switches the task on an active session without ending it — implements the "I'm Stuck" feature (FR-C-05).
 * Allows a user to pivot to a lower-energy task mid-session rather than abandoning the session entirely.
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

    // Only task_id is updated — start_time and all other columns are intentionally
    // left untouched so the session clock keeps running without interruption.
    // AND is_active = TRUE ensures the switch only applies to a running session; 0 rows → 404
    const result = await pool.query(
      `UPDATE focus_session SET task_id = $1
       WHERE session_id = $2 AND user_id = $3 AND is_active = TRUE
       RETURNING *`,
      [new_task_id, session_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Active session not found." });
    }

    // Captured for ADHD abandonment analysis — frequency of task switches signals friction
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
