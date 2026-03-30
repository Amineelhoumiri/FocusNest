// Builds a test Express app with the real routes but mocked auth middleware.
// Called after jest.mock() calls are set up in each test file.
const express = require("express");

const buildApp = () => {
  const app = express();
  app.use(express.json());

  const { mockAuthMiddleware } = require("./mockAuth");

  // Override the auth middleware module so all routes use the mock
  jest.mock("../../middleware/auth", () => mockAuthMiddleware);

  app.use("/api/users", require("../../routes/users.routes"));
  app.use("/api/tasks", require("../../routes/tasks.routes"));
  app.use("/api/sessions", require("../../routes/sessions.routes"));

  return app;
};

module.exports = { buildApp };
