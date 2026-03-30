// routes/tasks.routes.js
// Defines all task-related endpoints.
// All routes are protected and do require a valid JWT token.

const express = require("express");
const router = express.Router();
const tasksController = require("../controllers/tasks.controller");     // Controller functions for task operations
const auth = require("../middleware/auth"); // Middleware to protect routes and attach user info to req.user
const subtasksRoutes = require("./subtasks.routes"); // Subtasks routes


// GET /api/tasks : get all tasks for logged in user
router.get("/", auth, tasksController.getTasks);

// GET /api/tasks/:task_id : get a single task
router.get("/:task_id", auth, tasksController.getTask);

// POST /api/tasks : create a new task
router.post("/", auth, tasksController.createTask);

// PATCH /api/tasks/:task_id : update a task (move Kanban status, rename etc.)
router.patch("/:task_id", auth, tasksController.updateTask);

// DELETE /api/tasks/:task_id : delete a task
router.delete("/:task_id", auth, tasksController.deleteTask);

// Mount subtasks routes under /api/tasks/:task_id/subtasks
router.use("/:task_id/subtasks", subtasksRoutes);

module.exports = router;