/**
 * CORS + Better Auth trusted origins from env.
 * ALLOWED_ORIGINS: comma-separated list (e.g. https://app.example.com,https://www.example.com)
 * CLIENT_URL: primary browser origin (added if not already listed)
 */

function getTrustedOrigins() {
    const raw = process.env.ALLOWED_ORIGINS;
    const clientUrl = (process.env.CLIENT_URL || "").replace(/\/$/, "");

    if (raw && raw.trim()) {
        const set = new Set(
            raw
                .split(",")
                .map((s) => s.trim().replace(/\/$/, ""))
                .filter(Boolean)
        );
        if (clientUrl) {
            set.add(clientUrl);
            if (clientUrl.includes("localhost")) {
                try {
                    const u = new URL(clientUrl);
                    const twin =
                        u.port && u.port.length > 0
                            ? `${u.protocol}//127.0.0.1:${u.port}`
                            : `${u.protocol}//127.0.0.1`;
                    set.add(twin);
                } catch {
                    /* ignore invalid CLIENT_URL */
                }
            }
        }
        return [...set];
    }

    const defaults = [
        clientUrl || "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ].filter(Boolean);

    return [...new Set(defaults)];
}

module.exports = { getTrustedOrigins };
