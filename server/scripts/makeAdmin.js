require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
});

const makeAdmin = async () => {
    const email = process.argv[2];

    if (!email) {
        console.error("❌ Please provide an email address.");
        console.error("Usage: node makeAdmin.js <user_email>");
        process.exit(1);
    }

    try {
        // Update Better Auth "user" table
        const baResult = await pool.query(
            `UPDATE "user" SET is_admin = true WHERE email = $1 RETURNING id, email, is_admin`,
            [email]
        );

        if (baResult.rows.length === 0) {
            console.error(`❌ No user found with email "${email}".`);
            const all = await pool.query(`SELECT email, is_admin FROM "user" ORDER BY email`);
            console.log("\nExisting users:");
            all.rows.forEach(r => console.log(`  ${r.is_admin ? "✅" : "  "} ${r.email}`));
            return;
        }

        // Also update the app-level users mirror table
        await pool.query(
            `UPDATE users SET is_admin = true
             FROM "user" ba
             WHERE ba.id::uuid = users.user_id AND ba.email = $1`,
            [email]
        );

        console.log("✅ Successfully promoted to admin!");
        console.log(baResult.rows[0]);
        console.log("\n👉 The user must log out and log back in for the change to take effect.");
    } catch (err) {
        console.error("Database error:", err.message);
    } finally {
        pool.end();
    }
};

makeAdmin();
