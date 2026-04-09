/**
 * Transactional email for Better Auth (verification + password reset).
 * - RESEND_API_KEY: sends via https://resend.com (recommended in production)
 * - Otherwise: logs the full message (local dev); in production without Resend, logs a warning.
 */

const { agentDebugLog } = require("../debug-agent-log");

const RESEND_API = "https://api.resend.com/emails";

function mailFrom() {
    return process.env.MAIL_FROM || "FocusNest <onboarding@resend.dev>";
}

async function sendViaResend({ to, subject, text, html }) {
    const key = process.env.RESEND_API_KEY;
    if (!key) return false;
    const body = {
        from: mailFrom(),
        to: [to],
        subject,
        text,
        html: html || `<pre style="font-family:sans-serif">${escapeHtml(text)}</pre>`,
    };
    const res = await fetch(RESEND_API, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Resend API ${res.status}: ${errText}`);
    }
    try {
        const data = await res.json();
        if (data?.id) console.info(`[mail] Resend accepted message id=${data.id} → ${to}`);
        else console.info(`[mail] Resend accepted → ${to}`);
    } catch {
        console.info(`[mail] Resend accepted → ${to}`);
    }
    return true;
}

/** Log verification/reset links in dev so you can copy them even when Resend is configured. */
function logDevMailPreview(text) {
    if (process.env.NODE_ENV === "production") return;
    const lines = String(text).split("\n");
    const urls = lines.filter((l) => /https?:\/\//i.test(l));
    if (urls.length) {
        console.info("[mail] (dev) copy link from message:");
        urls.forEach((u) => console.info("    ", u.trim()));
    }
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/**
 * @param {{ to: string, subject: string, text: string, html?: string }} opts
 */
async function sendTransactionalEmail(opts) {
    const { to, subject, text, html } = opts;
    // #region agent log
    agentDebugLog({
        hypothesisId: "H4",
        location: "mail.service.js:sendTransactionalEmail:entry",
        message: "sendTransactionalEmail called",
        data: {
            subjectSnippet: String(subject || "").slice(0, 24),
            hasResendKey: !!process.env.RESEND_API_KEY,
            toDomain: to && typeof to === "string" && to.includes("@") ? to.split("@")[1] : "",
        },
    });
    // #endregion
    logDevMailPreview(text);
    try {
        const sent = await sendViaResend({ to, subject, text, html });
        // #region agent log
        agentDebugLog({
            hypothesisId: "H4",
            location: "mail.service.js:sendTransactionalEmail:afterResend",
            message: "Resend attempt result",
            data: { sentViaResend: !!sent },
        });
        // #endregion
        if (sent) return;
    } catch (e) {
        // #region agent log
        agentDebugLog({
            hypothesisId: "H4",
            location: "mail.service.js:sendTransactionalEmail:resendCatch",
            message: "Resend threw",
            data: { err: String(e && e.message ? e.message : e) },
        });
        // #endregion
        console.error("[mail] Resend failed:", e.message);
        const errMsg = String(e && e.message ? e.message : e);
        if (
            process.env.NODE_ENV !== "production" &&
            errMsg.includes("403") &&
            /only send testing emails to your own email/i.test(errMsg)
        ) {
            console.warn(
                "[mail] Resend sandbox: without a verified domain, you can only deliver to your Resend account email. " +
                    "Options: sign up / reset with that email, verify a domain at https://resend.com/domains and set MAIL_FROM, " +
                    "or use the (dev) link printed above."
            );
        }
        throw e;
    }

    const isProd = process.env.NODE_ENV === "production";
    if (isProd) {
        console.warn(
            "[mail] RESEND_API_KEY not set — cannot send email in production. Add Resend or another provider."
        );
    } else {
        console.warn(
            "\n┌─────────────────────────────────────────────────────────────────────\n" +
                "│ [mail] No RESEND_API_KEY — email was NOT sent to the real inbox.\n" +
                "│ Add RESEND_API_KEY (and optional MAIL_FROM) to server/.env, or copy the\n" +
                "│ link below into your browser (verification / password reset).\n" +
                "└─────────────────────────────────────────────────────────────────────\n"
        );
    }
    console.info("[mail] (fallback) message body:\n" + `  To: ${to}\n  Subject: ${subject}\n  ---\n${text}\n  ---`);
}

module.exports = { sendTransactionalEmail, mailFrom };
