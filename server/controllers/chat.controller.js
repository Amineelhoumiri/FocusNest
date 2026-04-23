const pool = require("../config/db");
const { encrypt, decrypt } = require("../services/encryption.service");
const posthog = require("../posthog");

// Helper to validate UUID format
const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

/**
 * Initialises a new chat session for the authenticated user.
 * 
 * @route POST /api/chat
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const startChatSession = async (req, res) => {
    try {
        const { user_id } = req.user;

        const result = await pool.query(
            `INSERT INTO chat_sessions (user_id)
             VALUES ($1)
             RETURNING *`,
            [user_id]
        );

        const session = result.rows[0];

        posthog.capture({
            distinctId: String(user_id),
            event: "chat_session_started",
            properties: { chat_session_id: session.chat_session_id },
        });

        return res.status(201).json(session);
    } catch (err) {
        console.error("startChatSession error:", err.message);
        posthog.captureException(err, String(req.user?.user_id));
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to start chat session" });
    }
};

/**
 * Retrieves the full chat history of a specific chat session,
 * decrypting messages before returning them to the client.
 * 
 * @route GET /api/chat/:chat_session_id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getChatHistory = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { chat_session_id } = req.params;

        if (!isValidUUID(chat_session_id)) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid chat_session_id format." });
        }

        // Verify the session belongs to the user
        const sessionCheck = await pool.query(
            `SELECT chat_session_id FROM chat_sessions WHERE chat_session_id = $1 AND user_id = $2`,
            [chat_session_id, user_id]
        );

        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ error: "NOT_FOUND", message: "Chat session not found." });
        }

        // Get messages
        const result = await pool.query(
            `SELECT * FROM chat_messages WHERE chat_session_id = $1 ORDER BY created_at ASC`,
            [chat_session_id]
        );

        const messages = await Promise.all(result.rows.map(async (row) => ({
            ...row,
            content: await decrypt(row.content.toString()), // decrypt content
        })));

        return res.status(200).json(messages);
    } catch (err) {
        console.error("getChatHistory error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to get chat history" });
    }
};

/**
 * Encrypts and sends a new message within an active chat session.
 * 
 * @route POST /api/chat/:chat_session_id/messages
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendMessage = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { chat_session_id } = req.params;
        const { role, content, token_count = 0 } = req.body;

        if (!isValidUUID(chat_session_id)) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid chat_session_id format." });
        }

        if (!role || !content) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "role and content are required." });
        }

        // Verify the session belongs to the user
        const sessionCheck = await pool.query(
            `SELECT chat_session_id, ended_at FROM chat_sessions WHERE chat_session_id = $1 AND user_id = $2`,
            [chat_session_id, user_id]
        );

        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ error: "NOT_FOUND", message: "Chat session not found." });
        }

        if (sessionCheck.rows[0].ended_at) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "Chat session is already ended." });
        }

        const encryptedContent = await encrypt(content);

        const result = await pool.query(
            `INSERT INTO chat_messages (chat_session_id, role, content, token_count)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [chat_session_id, role, encryptedContent, token_count]
        );

        const newMessage = result.rows[0];
        newMessage.content = await decrypt(newMessage.content.toString());

        // Update chat_sessions updated_at
        await pool.query(
            `UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE chat_session_id = $1`,
            [chat_session_id]
        );

        posthog.capture({
            distinctId: String(user_id),
            event: "chat_message_sent",
            properties: {
                chat_session_id: chat_session_id,
                role: role,
                token_count: token_count,
            },
        });

        return res.status(201).json(newMessage);
    } catch (err) {
        console.error("sendMessage error:", err.message);
        posthog.captureException(err, String(req.user?.user_id));
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to send message" });
    }
};

/**
 * Ends an active chat session by recording the `ended_at` timestamp.
 * 
 * @route PATCH /api/chat/:chat_session_id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const endChatSession = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { chat_session_id } = req.params;

        if (!isValidUUID(chat_session_id)) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid chat_session_id format." });
        }

        const result = await pool.query(
            `UPDATE chat_sessions 
             SET ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE chat_session_id = $1 AND user_id = $2 AND ended_at IS NULL
             RETURNING *`,
            [chat_session_id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "NOT_FOUND", message: "Chat session not found or already ended." });
        }

        posthog.capture({
            distinctId: String(user_id),
            event: "chat_session_ended",
            properties: { chat_session_id: chat_session_id },
        });

        return res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error("endChatSession error:", err.message);
        posthog.captureException(err, String(req.user?.user_id));
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to end chat session" });
    }
};

const getUserSessions = async (req, res) => {
    try {
        const { user_id } = req.user;
        const result = await pool.query(
            `SELECT
               cs.chat_session_id, cs.created_at, cs.updated_at, cs.ended_at,
               (
                 SELECT cm.content
                 FROM chat_messages cm
                 WHERE cm.chat_session_id = cs.chat_session_id
                   AND cm.role = 'user'
                 ORDER BY cm.created_at ASC
                 LIMIT 1
               ) AS first_message
             FROM chat_sessions cs
             WHERE cs.user_id = $1
             ORDER BY cs.updated_at DESC
             LIMIT 30`,
            [user_id]
        );

        const sessions = await Promise.all(result.rows.map(async (row) => {
            let preview = null;
            if (row.first_message) {
                try {
                    const text = await decrypt(row.first_message.toString());
                    preview = text.slice(0, 100);
                } catch { /* ignore — preview is non-critical */ }
            }
            return {
                chat_session_id: row.chat_session_id,
                created_at: row.created_at,
                updated_at: row.updated_at,
                ended_at: row.ended_at,
                preview,
            };
        }));

        return res.status(200).json(sessions);
    } catch (err) {
        console.error("getUserSessions error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
    }
};

const deleteSession = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { chat_session_id } = req.params;

        if (!isValidUUID(chat_session_id)) {
            return res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid chat_session_id format." });
        }

        // Delete messages first, then the session (handles DBs without CASCADE).
        await pool.query(
            `DELETE FROM chat_messages WHERE chat_session_id = $1`,
            [chat_session_id]
        );
        const result = await pool.query(
            `DELETE FROM chat_sessions WHERE chat_session_id = $1 AND user_id = $2 RETURNING chat_session_id`,
            [chat_session_id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "NOT_FOUND", message: "Chat session not found." });
        }

        return res.status(200).json({ deleted: true });
    } catch (err) {
        console.error("deleteSession error:", err.message);
        return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
    }
};

module.exports = { startChatSession, getChatHistory, sendMessage, endChatSession, getUserSessions, deleteSession };
