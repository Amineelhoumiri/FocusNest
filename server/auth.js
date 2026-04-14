require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const path = require("path");
const { pathToFileURL } = require("url");
const { betterAuth } = require("better-auth");
const pool = require("./config/db");
const { getTrustedOrigins } = require("./config/allowedOrigins");
const { sendTransactionalEmail } = require("./services/mail.service");

const rawPublicUrl = (process.env.BETTER_AUTH_URL || process.env.CLIENT_URL || "").replace(/\/$/, "");
/** Required for correct OAuth redirect_uri and cookie issuance; must match the browser origin (e.g. Vite :8080). */
const baseURL = rawPublicUrl || undefined;

/**
 * With requireEmailVerification, Better Auth returns a generic "success" for duplicate sign-ups
 * without calling sendVerificationEmail — so unverified users never get a new link.
 * We resend when the row already exists and email is still unverified.
 */
async function buildVerificationUrlForEmail(email) {
  const secret = process.env.BETTER_AUTH_SECRET;
  const base = rawPublicUrl;
  if (!secret || !base) return null;
  try {
    const evFile = path.join(__dirname, "node_modules", "better-auth", "dist", "api", "routes", "email-verification.mjs");
    const { createEmailVerificationToken } = await import(pathToFileURL(evFile).href);
    const token = await createEmailVerificationToken(
      secret,
      email,
      undefined,
      undefined
    );
    const callbackURL = encodeURIComponent(`${base}/login?verified=1`);
    return `${base}/verify-email?token=${token}&callbackURL=${callbackURL}`;
  } catch (e) {
    console.error("[auth] buildVerificationUrlForEmail failed:", e?.message || e);
    return null;
  }
}

const auth = betterAuth({
  ...(baseURL ? { baseURL } : {}),

  // ── Logger (visible in App Runner / CloudWatch stdout) ───────
  logger: {
    level: "debug",
    disabled: false,
  },

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
    /**
     * Default: email/password sign-in requires a verified address (verification email on sign-up).
     * Set REQUIRE_EMAIL_VERIFICATION=false for local dev without a mail provider.
     */
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION !== "false",
    sendResetPassword: async ({ user, url }) => {
      if (process.env.NODE_ENV !== "production") {
        console.info(`[auth] sendResetPassword for ${user?.email || "(no email)"}`);
      }
      try {
        await sendTransactionalEmail({
          to: user.email,
          subject: "Reset your FocusNest password",
          text: [
            "Hi,",
            "",
            "We received a request to reset the password for your FocusNest account.",
            `Open this link to choose a new password (it expires in about an hour):`,
            url,
            "",
            "If you did not ask for this, you can ignore this email.",
            "",
            "— FocusNest",
          ].join("\n"),
        });
      } catch (err) {
        console.error("[auth] sendResetPassword:", err?.message || err);
        throw err;
      }
    },
    /**
     * Fires when email already exists and requireEmailVerification is on (before generic JSON response).
     * Without this, repeat sign-ups send no mail and the API logs show no sendVerificationEmail.
     */
    onExistingUserSignUp: async ({ user }) => {
      if (user.emailVerified) {
        if (process.env.NODE_ENV !== "production") {
          console.info(`[auth] sign-up duplicate: ${user.email} (already verified)`);
        }
        return;
      }
      if (process.env.NODE_ENV !== "production") {
        console.info(`[auth] sign-up duplicate: ${user.email} (unverified — resending verification email)`);
      }
      try {
        const verifyUrl = await buildVerificationUrlForEmail(user.email);
        if (!verifyUrl) {
          console.error("[auth] onExistingUserSignUp: missing BETTER_AUTH_SECRET or public URL for verify link");
          return;
        }
        await sendTransactionalEmail({
          to: user.email,
          subject: "Verify your FocusNest email",
          text: [
            "Hi,",
            "",
            "Please confirm your email address for FocusNest by opening this link:",
            verifyUrl,
            "",
            "— FocusNest",
          ].join("\n"),
        });
      } catch (err) {
        console.error("[auth] onExistingUserSignUp:", err?.message || err);
      }
    },
  },

  // ── Email verification ─────────────────────────────────────────
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      // OAuth users (Google, Apple) already have their email verified by the provider.
      // Better Auth still calls this hook for them when sendOnSignUp is true — skip it
      // so a Resend failure can't poison the OAuth session setup.
      if (user?.emailVerified) {
        if (process.env.NODE_ENV !== "production") {
          console.info(`[auth] sendVerificationEmail skipped — already verified (OAuth user)`);
        }
        return;
      }
      if (process.env.NODE_ENV !== "production") {
        console.info(`[auth] sendVerificationEmail for ${user?.email || "(no email)"}`);
      }
      try {
        await sendTransactionalEmail({
          to: user.email,
          subject: "Verify your FocusNest email",
          text: [
            "Hi,",
            "",
            "Please confirm your email address for FocusNest by opening this link:",
            url,
            "",
            "— FocusNest",
          ].join("\n"),
        });
      } catch (err) {
        // Do NOT re-throw — a mail delivery failure must not block the auth flow.
        // The user can request a new verification link from the login page.
        console.error("[auth] sendVerificationEmail:", err?.message || err);
      }
    },
  },

  // ── Social Providers ─────────────────────────────────────────
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Explicit redirect URI — prevents any ambiguity in how Better Auth
      // constructs this value internally during the token exchange with Google.
      redirectURI: rawPublicUrl ? `${rawPublicUrl}/api/auth/callback/google` : undefined,
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
  // Core consent stays false until POST /api/consent/register (email sign-up) or /welcome/consent (OAuth).
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
               VALUES ($1, $2, $3::date, FALSE, $4, $5, COALESCE($6, false))
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
