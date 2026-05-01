const { PostHog } = require("posthog-node");

// No-op stub used when POSTHOG_API_KEY is not set (local dev, staging without key, etc.)
const noop = new Proxy({}, {
  get: () => () => {},
});

if (!process.env.POSTHOG_API_KEY) {
  module.exports = noop;
} else {
  const posthog = new PostHog(process.env.POSTHOG_API_KEY, {
    host: process.env.POSTHOG_HOST || "https://eu.i.posthog.com",
  });

  process.on("SIGINT",  async () => { await posthog.shutdown(); process.exit(0); });
  process.on("SIGTERM", async () => { await posthog.shutdown(); process.exit(0); });

  module.exports = posthog;
}
