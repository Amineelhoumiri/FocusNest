import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "https://www.focusnest.uk",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
  },
});
