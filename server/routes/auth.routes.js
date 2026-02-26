// routes/auth.routes.js
// Defines all authentication endpoints.
// Routes are thin — they only define the URL, HTTP method, and which
// controller function handles the request. All logic lives in the controller.

const express = require("express");
const router = express.Router();

// Auth controller contains the actual logic for each route
const authController = require("../controllers/auth.controller");

// Auth middleware to protect the logout route
// (you must be logged in to log out)
const auth = require("../middleware/auth");

// Public Routes (no token required)

// POST /api/auth/register
// Creates a new user account and sets HttpOnly cookie with tokens
router.post("/register", authController.register);

// POST /api/auth/login
// Authenticates user credentials and sets HttpOnly cookie with tokens
router.post("/login", authController.login);

// POST /api/auth/refresh
// Issues a new access token using the refresh token from the cookie
router.post("/refresh", authController.refresh);

// Protected Routes (token required)

// POST /api/auth/logout
// Revokes the refresh token and clears the HttpOnly cookie
router.post("/logout", auth, authController.logout);

module.exports = router;