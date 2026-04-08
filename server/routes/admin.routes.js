const express = require("express");
const { getUsage, getChatTokenStats, getMaskedActivity, getSystemPrompts, createSystemPrompt, updateSystemPrompt, deleteSystemPrompt, deleteUserAccount } = require("../controllers/admin.controller");
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

const router = express.Router();

router.get("/usage", auth, isAdmin, getUsage);
router.get("/chat-tokens", auth, isAdmin, getChatTokenStats);
router.get("/masked-activity", auth, isAdmin, getMaskedActivity);
router.get("/prompts", auth, isAdmin, getSystemPrompts);
router.post("/prompts", auth, isAdmin, createSystemPrompt);
router.patch("/prompts/:key", auth, isAdmin, updateSystemPrompt);
router.delete("/prompts/:key", auth, isAdmin, deleteSystemPrompt);
router.delete("/users/:user_id", auth, isAdmin, deleteUserAccount);

module.exports = router;
