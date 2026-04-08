// Database configuration
// Initialise database connection pool
const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // DB_SSL=false disables SSL (use for local PG or RDS without SSL enforcement)
    // Omit or set DB_SSL=true for AWS RDS with SSL enabled
    ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
});

// Test database connection on startup (skip in Jest — tests mock this module; avoids async logs / RDS leaks)
if (process.env.NODE_ENV !== "test") {
    pool.connect((err, client, release) => {
        if (err) {
            console.error("Database connection failed:", err.message);
            if (err.code === "ETIMEDOUT") {
                console.error(
                    "  → ETIMEDOUT: nothing is accepting port 5432 at DB_HOST (firewall / security group / RDS not public).\n" +
                    "     · RDS: inbound rule for PostgreSQL from your current public IP (and set Publicly accessible if you connect from your laptop).\n" +
                    "     · Local dev: point DB_* at localhost or use an SSH tunnel / VPN to the VPC."
                );
            }
        } else {
            const host = process.env.DB_HOST || "(unset)";
            const port = process.env.DB_PORT || "5432";
            const local = /^(127\.0\.0\.1|localhost)$/i.test(String(process.env.DB_HOST || ""));
            console.log(
                local
                    ? `Database connected (local) — postgresql://${host}:${port}/${process.env.DB_NAME || ""}`
                    : `Database connected (deployed / remote) — ${host}:${port}`
            );
            release();
        }
    });
}

module.exports = pool;