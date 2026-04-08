/**
 * Validates required environment variables on startup.
 * Logs clearly what is missing so App Runner / CloudWatch logs make the
 * problem obvious instead of showing cryptic downstream errors.
 */

const REQUIRED = [
  // Database
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  // Auth
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  // CORS
  "CLIENT_URL",
  // AWS / Encryption
  "AWS_REGION",
  "KMS_KEY_ID",
];

const OPTIONAL_BUT_NOTABLE = [
  "OPENAI_API_KEY",
  "SENTRY_DSN",
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "SPOTIFY_REDIRECT_URI",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
];

function runStartupCheck() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  const missingOptional = OPTIONAL_BUT_NOTABLE.filter((k) => !process.env[k]);

  if (missing.length > 0) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("✗ MISSING REQUIRED ENV VARS — server will not work:");
    missing.forEach((k) => console.error(`    ${k}`));
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } else {
    console.log("✓ All required env vars present");
  }

  if (missingOptional.length > 0) {
    console.warn("⚠ Optional env vars not set (features will be disabled):");
    missingOptional.forEach((k) => console.warn(`    ${k}`));
  }

  // Warn if BETTER_AUTH_URL looks like localhost in a non-dev environment
  const authUrl = process.env.BETTER_AUTH_URL || "";
  if (process.env.NODE_ENV === "production" && authUrl.includes("localhost")) {
    console.error("✗ BETTER_AUTH_URL is set to localhost in production — auth cookies will not work!");
  }

  if (process.env.NODE_ENV === "production") {
    console.log(`  BETTER_AUTH_URL : ${authUrl || "(not set)"}`);
    console.log(`  CLIENT_URL      : ${process.env.CLIENT_URL || "(not set)"}`);
  }
}

module.exports = { runStartupCheck };
