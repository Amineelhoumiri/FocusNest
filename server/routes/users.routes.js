// routes/users.routes.js
// Defines all user-related endpoints.
// All routes here are protected — require a valid JWT token.

const express = require("express");
const router = express.Router();
const usersController = require("../controllers/users.controller");
const auth = require("../middleware/auth");

// All routes below require authentication
// auth middleware verifies JWT and attaches req.user

// GET /api/users/me — get logged in user's profile
router.get("/me", auth, usersController.getMe);

// PATCH /api/users/me — update logged in user's profile
router.patch("/me", auth, usersController.updateMe);

// GET /api/users/me/export — download all user data as JSON (GDPR)
router.get("/me/export", auth, usersController.exportData);

// DELETE /api/users/me/nuke — permanently delete account and all data
router.delete("/me/nuke", auth, usersController.nukeAccount);

module.exports = router;