const express = require("express");
const auth = require("../middleware/auth");
const { generateTaskBreakdown, prioritizeTasks, buildMomentum } = require("../services/ai.service.js");

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

module.exports = router;