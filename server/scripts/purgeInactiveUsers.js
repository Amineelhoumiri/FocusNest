#!/usr/bin/env node
/**
 * Deletes users whose last_login_at is older than IDLE_PURGE_DAYS (default 90).
 * Intended to run on a schedule (e.g. AWS Lambda, EventBridge + ECS task, or cron).
 *
 * Usage: node scripts/purgeInactiveUsers.js
 * Env: DATABASE_URL / pool config via .env, IDLE_PURGE_DAYS=90
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const pool = require("../config/db");

const DAYS = Math.max(1, parseInt(process.env.IDLE_PURGE_DAYS || "90", 10));

async function main() {
  const res = await pool.query(
    `DELETE FROM users
     WHERE last_login_at IS NOT NULL
       AND last_login_at < NOW() - ($1::int * INTERVAL '1 day')`,
    [DAYS]
  );
  console.log(`[purgeInactiveUsers] Deleted ${res.rowCount} user(s) idle longer than ${DAYS} days.`);
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("[purgeInactiveUsers]", err);
  process.exit(1);
});
