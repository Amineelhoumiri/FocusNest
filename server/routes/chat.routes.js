const express = require("express");
const { startChatSession, getChatHistory, sendMessage, endChatSession, getUserSessions, deleteSession } = require("../controllers/chat.controller");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", auth, getUserSessions);
router.post("/", auth, startChatSession);
router.get("/:chat_session_id", auth, getChatHistory);
router.post("/:chat_session_id/messages", auth, sendMessage);
router.patch("/:chat_session_id", auth, endChatSession);
router.delete("/:chat_session_id", auth, deleteSession);

module.exports = router;
