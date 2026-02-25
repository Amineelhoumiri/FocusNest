// Database configuration
// Initialise database connection pool

const { Pool } = require("pg");   // PostgreSQL client for Node.js

// Create a new connection pool using environment variables for configuration
const pool = new Pool({
    host: process.env.DB_HOST,      // database server adddress
    port: process.env.DB_PORT,      // database server port
    database: process.env.DB_NAME,  // database name
    user: process.env.DB_USER,      // database user
    password: process.env.DB_PASSWORD,  // database password
});
console.log("DB Config:", {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
});
// Test database connection
pool.connect((err, client, release) => {    // Attempt to acquire a client from the pool
    if (err) {
        console.error("Error acquiring client", err.message);       // Log error if connection fails
    } else {
        console.log("Database connection established");     // Log success message if connection is successful
        release();      // Release the client back to the pool after testing connection
    }
});

// Export the pool for use in other parts of the application
module.exports = pool;    
