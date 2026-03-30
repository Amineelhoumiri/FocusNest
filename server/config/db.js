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

// Test database connection on startup
pool.connect((err, client, release) => {
    if (err) {
        console.error("Error acquiring client", err.message);
    } else {
        console.log("Database connection established");
        release();
    }
});

module.exports = pool;