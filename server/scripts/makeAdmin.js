require("dotenv").config();
const { Pool } = require("pg");
const { decrypt } = require("../services/encryption.service");

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
        console.log("🔍 Searching for account... (this might take a few seconds due to KMS decryption)");
        const allAccounts = await pool.query("SELECT user_id, encrypted_email FROM account");

        let targetUserId = null;
        for (const row of allAccounts.rows) {
            const decEmail = await decrypt(row.encrypted_email.toString());
            if (decEmail && decEmail.toLowerCase() === email.toLowerCase()) {
                targetUserId = row.user_id;
                break;
            }
        }

        if (!targetUserId) {
            console.error(`❌ User with email "${email}" not found.`);
            return;
        }

        const result = await pool.query(
            "UPDATE users SET is_admin = true WHERE user_id = $1 RETURNING full_name, is_admin",
            [targetUserId]
        );

        console.log("✅ Successfully updated user to admin!");
        console.log(result.rows[0]);

    } catch (err) {
        console.error("Database error:", err.message);
    } finally {
        pool.end();
    }
};

makeAdmin();
