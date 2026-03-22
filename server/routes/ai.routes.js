const express = require("express");
const auth = require("../middleware/auth");
const { generateTaskBreakdown, prioritizeTasks, buildMomentum, converseWithFinch } = require("../services/ai.service.js");

const router = express.Router();

// 1. Task Breakdown
router.post("/breakdown", auth, async (req, res) => {
    try {
        const { task } = req.body;
        const result = await generateTaskBreakdown(task, req.user.user_id);
        res.json({ success: true, result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "AI breakdown request failed" });
    }
});

// 2. Task Prioritization
router.post("/prioritize", auth, async (req, res) => {
    try {
        const { task } = req.body;
        const result = await prioritizeTasks(task, req.user.user_id);
        res.json({ success: true, result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "AI prioritization request failed" });
    }
});

// 3. Momentum Builder
router.post("/momentum", auth, async (req, res) => {
    try {
        const { task } = req.body;
        const result = await buildMomentum(task, req.user.user_id);
        res.json({ success: true, result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "AI momentum request failed" });
    }
});

// 4. Conversational Finch — multi-turn chat with clarifying questions
router.post("/converse", auth, async (req, res) => {
    try {
        const { messages } = req.body;
        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: "messages array is required" });
        }
        const result = await converseWithFinch(messages, req.user.user_id);
        res.json({ success: true, result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "AI converse request failed" });
    }
});

module.exports = router;