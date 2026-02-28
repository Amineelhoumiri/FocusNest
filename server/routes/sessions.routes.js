const express = require("express");
const { startSession, getSessions, endSession, switchSession } = require("../controllers/sessions.controller");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/", auth, startSession);
router.get("/", auth, getSessions);
router.patch("/:session_id", auth, endSession);
router.post("/:session_id/switch", auth, switchSession);

module.exports = router;
