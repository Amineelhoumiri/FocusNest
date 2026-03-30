const express = require("express");
const { getUsage, getChatTokenStats, getSystemPrompts, updateSystemPrompt, deleteSystemPrompt } = require("../controllers/admin.controller");
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

const router = express.Router();

router.get("/usage", auth, isAdmin, getUsage);
router.get("/chat-tokens", auth, isAdmin, getChatTokenStats);
router.get("/prompts", auth, isAdmin, getSystemPrompts);
router.patch("/prompts/:key", auth, isAdmin, updateSystemPrompt);
router.delete("/prompts/:key", auth, isAdmin, deleteSystemPrompt);

module.exports = router;
