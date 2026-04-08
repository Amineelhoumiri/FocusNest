require("dotenv").config();
const { betterAuth } = require("better-auth");
const pool = require("./config/db");
const { getTrustedOrigins } = require("./config/allowedOrigins");

const rawPublicUrl = (process.env.BETTER_AUTH_URL || process.env.CLIENT_URL || "").replace(/\/$/, "");
/** Required for correct OAuth redirect_uri and cookie issuance; must match the browser origin (e.g. Vite :8080). */
const baseURL = rawPublicUrl || undefined;

const auth = betterAuth({
  ...(baseURL ? { baseURL } : {}),

  // ── Database ────────────────────────────────────────────────
  // Pass the existing pg Pool directly — Better Auth detects it automatically.
  database: pool,

  // Better Auth uses: user, session, account, verification
  // Our app focus-session table is renamed to focus_session to avoid the clash.
  // Our old encrypted-email account table is renamed to app_account.
  advanced: {
    database: {
      generateId: () => require("crypto").randomUUID(),
    },
  },

  // ── Session ──────────────────────────────────────────────────
  session: {
    expiresIn: 60 * 60 * 24 * 30,   // 30 days
    updateAge: 60 * 60 * 24,         // Slide expiry if active within 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,               // 5-min cache avoids a DB hit on every request
    },
  },

  // ── Email + Password ─────────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  // ── Social Providers ─────────────────────────────────────────
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    },
  },

  // ── User Additional Fields ───────────────────────────────────
  // These columns are added to the ba_user table and can be set on sign-up.
  user: {
    additionalFields: {
      full_name: {
        type: "string",
        required: false,
        defaultValue: null,
      },
      date_of_birth: {
        type: "string",
        required: false,
        defaultValue: null,
      },
      is_admin: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      is_consented_ai: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      is_consented_spotify: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    },
  },

  // ── Database Hooks ───────────────────────────────────────────
  // After Better Auth creates a new user in ba_user, mirror them into
  // our domain `users` table so all existing FKs (tasks, sessions, etc.)
  // continue to work. ba_user.id === users.user_id (same UUID).
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            const fullName =
              user.full_name || user.name || (user.email ? user.email.split("@")[0] : null) || "User";
            // users.date_of_birth is NOT NULL — OAuth users have no DOB; use a placeholder.
            const dobRaw = user.date_of_birth;
            const dob =
              dobRaw != null && String(dobRaw).trim() !== "" ? String(dobRaw).trim() : "2000-01-01";
            await pool.query(
              `INSERT INTO users
                 (user_id, full_name, date_of_birth, is_consented_core, is_consented_ai, is_consented_spotify, is_admin)
               VALUES ($1, $2, $3::date, TRUE, $4, $5, COALESCE($6, false))
               ON CONFLICT (user_id) DO NOTHING`,
              [
                user.id,
                fullName,
                dob,
                user.is_consented_ai || false,
                user.is_consented_spotify || false,
                user.is_admin || false,
              ]
            );
          } catch (err) {
            console.error("databaseHook users insert error:", err.message);
          }
        },
      },
    },
  },

  trustedOrigins: getTrustedOrigins(),
});

module.exports = auth;
