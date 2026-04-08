/**
 * Sets safe localhost defaults when NODE_ENV is not production so you can run
 * the API without duplicating CLIENT_URL / BETTER_AUTH_URL in .env for every machine.
 *
 * For Vite-only UI dev (port 8080), set in .env:
 *   CLIENT_URL=http://localhost:8080
 *   BETTER_AUTH_URL=http://localhost:8080
 */

function applyDevEnvDefaults() {
  if (process.env.NODE_ENV === "production") return;

  const trim = (v) => (v || "").trim();

  if (!trim(process.env.CLIENT_URL)) {
    // Default matches Vite dev (port 8080) with API on PORT; keeps OAuth redirect_uri + cookies aligned with the browser.
    process.env.CLIENT_URL = "http://localhost:8080";
    console.log(
      "[dev] CLIENT_URL was unset → http://localhost:8080\n" +
        "      If you open only http://localhost:3000 (no Vite), set CLIENT_URL and BETTER_AUTH_URL=http://localhost:3000 in server/.env"
    );
  }

  if (!trim(process.env.BETTER_AUTH_URL)) {
    process.env.BETTER_AUTH_URL = process.env.CLIENT_URL.replace(/\/$/, "");
    console.log("[dev] BETTER_AUTH_URL was unset → same origin as CLIENT_URL");
  }
}

module.exports = { applyDevEnvDefaults };
