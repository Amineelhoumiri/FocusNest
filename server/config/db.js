// Database configuration
// Initialise database connection pool
const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false  // Required for AWS RDS SSL connection
    }
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