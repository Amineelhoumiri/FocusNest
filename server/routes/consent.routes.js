const express = require("express");
const { updateConsent, getConsentHistory, recordInitialConsent } = require("../controllers/consent.controller");
const auth = require("../middleware/auth");

const router = express.Router();

// Registration consent (prefer this path in prod — lives outside /api/auth/* so infra/ALB never routes it away)
router.post("/register", auth, recordInitialConsent);
router.patch("/", auth, updateConsent);
router.get("/history", auth, getConsentHistory);

module.exports = router;
