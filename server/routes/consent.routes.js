const express = require("express");
const { updateConsent, getConsentHistory } = require("../controllers/consent.controller");
const auth = require("../middleware/auth");

const router = express.Router();

router.patch("/", auth, updateConsent);
router.get("/history", auth, getConsentHistory);

module.exports = router;
