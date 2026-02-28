// routes/subtasks.routes.js
// Defines all subtask-related endpoints.
// Subtasks are nested under tasks: /api/tasks/:task_id/subtasks
// All routes are protected and do require a valid JWT token.

const express = require("express");
const router = express.Router({ mergeParams: true }); // mergeParams allows access to :task_id from parent route
const subtasksController = require("../controllers/subtasks.controller");
const auth = require("../middleware/auth");

// GET /api/tasks/:task_id/subtasks
router.get("/", auth, subtasksController.getSubtasks);

// GET /api/tasks/:task_id/subtasks/:subtask_id
router.get("/:subtask_id", auth, subtasksController.getSubtask);

// POST /api/tasks/:task_id/subtasks
router.post("/", auth, subtasksController.createSubtask);

// PATCH /api/tasks/:task_id/subtasks/:subtask_id
router.patch("/:subtask_id", auth, subtasksController.updateSubtask);

// DELETE /api/tasks/:task_id/subtasks/:subtask_id
router.delete("/:subtask_id", auth, subtasksController.deleteSubtask);

module.exports = router;