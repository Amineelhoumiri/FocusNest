import { defineConfig } from "cypress";

// `CYPRESS_baseUrl=...` overrides; matches README local E2E (e.g. http://127.0.0.1:3000)
const baseUrl = process.env.CYPRESS_baseUrl || "https://www.focusnest.uk";
const isProd = baseUrl.includes("focusnest.uk");

export default defineConfig({
  e2e: {
    baseUrl,
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    // Defaults; override with CYPRESS_loginEmail, cypress.env.json, or --env
    env: {
      isProd: String(isProd),
      loginEmail: "login_e2e@focusnest.dev",
      loginPassword: "TestPass123!",
      tasksEmail: "tasks_e2e@focusnest.dev",
      tasksPassword: "TestPass123!",
    },
  },
});
