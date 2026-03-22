// E2E tests for authentication flows
// Requires both servers running: client on :8080, server on :3000

const TEST_EMAIL = `e2e_${Date.now()}@focusnest.dev`;
const TEST_PASSWORD = "TestPass123!";
const TEST_NAME = "E2E User";

describe("Registration flow", () => {
  it("registers a new account and lands on dashboard", () => {
    cy.visit("/register");

    // Step 1: fill registration form
    cy.get('input[type="text"]').first().type(TEST_NAME);
    cy.get('input[type="email"]').type(TEST_EMAIL);
    cy.get('input[type="password"]').first().type(TEST_PASSWORD);

    // Accept privacy (step 2)
    cy.contains("button", /next|continue/i).click();
    cy.contains("button", /agree|accept|register|create/i).click();

    cy.url({ timeout: 10000 }).should("include", "/dashboard");
  });
});

describe("Login flow", () => {
  before(() => {
    // Create account via API so tests don't depend on registration E2E
    cy.request("POST", "http://localhost:3000/api/auth/sign-up/email", {
      email: "login_e2e@focusnest.dev",
      password: "TestPass123!",
      name: "Login E2E",
    });
  });

  it("logs in with valid credentials and lands on dashboard", () => {
    cy.visit("/login");
    cy.get('input[type="email"]').type("login_e2e@focusnest.dev");
    cy.get('input[type="password"]').type("TestPass123!");
    cy.contains("button", /sign in/i).click();

    cy.url({ timeout: 10000 }).should("include", "/dashboard");
  });

  it("shows error on wrong password", () => {
    cy.visit("/login");
    cy.get('input[type="email"]').type("login_e2e@focusnest.dev");
    cy.get('input[type="password"]').type("WrongPassword!");
    cy.contains("button", /sign in/i).click();

    cy.contains(/invalid credentials/i, { timeout: 5000 }).should("be.visible");
    cy.url().should("include", "/login");
  });

  it("shows error on empty form submit", () => {
    cy.visit("/login");
    cy.contains("button", /sign in/i).click();
    cy.contains(/please fill in all fields/i).should("be.visible");
  });

  it("redirects unauthenticated user from /dashboard to /login", () => {
    cy.clearCookies();
    cy.visit("/dashboard");
    cy.url({ timeout: 5000 }).should("include", "/login");
  });
});

describe("Logout flow", () => {
  it("logs out and redirects to login", () => {
    cy.loginViaApi("login_e2e@focusnest.dev", "TestPass123!");
    cy.visit("/dashboard");
    cy.url({ timeout: 10000 }).should("include", "/dashboard");

    // Click logout (in navbar/sidebar)
    cy.contains("button", /log out|sign out/i).click();
    cy.url({ timeout: 5000 }).should("include", "/login");
  });
});

describe("Google OAuth button", () => {
  it("clicking Google button initiates redirect to accounts.google.com", () => {
    cy.visit("/login");

    // Intercept the social sign-in request to avoid a real Google redirect
    cy.intercept("POST", "**/api/auth/sign-in/social", {
      statusCode: 200,
      body: { url: "https://accounts.google.com/o/oauth2/auth?mock=true" },
    }).as("googleSignIn");

    cy.contains("button", /google/i).click();
    cy.wait("@googleSignIn").its("request.body.provider").should("eq", "google");
  });
});
