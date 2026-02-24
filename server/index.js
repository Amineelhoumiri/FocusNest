require("dotenv").config(); // Load environment variables
require("./instrument.js"); // setup Sentry instrumentation
const express = require("express");
const Sentry = require("@sentry/node");
const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  res.json({ message: `Server is running on port ${PORT}!` });
});

app.get("/debug-sentry", (req, res, next) => {
  const error = new Error("My first Sentry error!");
  next(error); // Pass error to error handler
});

// The Sentry error handler must be AFTER routes but BEFORE other error middleware
Sentry.setupExpressErrorHandler(app);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server is running and listening on port ${PORT}`);

});
