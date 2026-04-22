// E2E tests for authentication flows
// Against production: registration is skipped (email verification required).
// Set loginEmail / loginPassword in cypress.env.json for a pre-verified account.

const TEST_EMAIL = `e2e_${Date.now()}@focusnest.dev`;
const TEST_PASSWORD = "TestPass123!";
const TEST_NAME = "E2E User";

const LOGIN_EMAIL = Cypress.env("loginEmail") ?? "login_e2e@focusnest.dev";
const LOGIN_PASSWORD = Cypress.env("loginPassword") ?? "TestPass123!";

describe("Registration flow", () => {
  before(function () {
    // Production requires email verification before the user lands on /dashboard.
    // This test only runs against a local stack where verification is not enforced.
    if (Cypress.config("baseUrl")?.toString().includes("focusnest.uk")) this.skip();
  });

  it("registers a new account and lands on dashboard", () => {
    cy.visit("/register");

    // Step 1: fill registration form
    cy.get('input[type="text"]').first().type(TEST_NAME);
    cy.get('input[type="date"]').type("2000-01-15");
    cy.get('input[type="email"]').type(TEST_EMAIL);
    cy.get('input[type="password"]').first().type(TEST_PASSWORD);
    cy.get('input[type="password"]').last().type(TEST_PASSWORD);

    // Step 2: legal + core data consent (required to enable submit)
    cy.contains("button", /^continue$/i).click();

    // Terms dialog: scroll gate then "I agree"
    cy.contains("button", /^terms & conditions$/i).click();
    cy.get('[role="dialog"] [data-state="open"]')
      .find("div")
      .contains(/summary for quick reading/i)
      .should("be.visible");
    cy.get('[role="dialog"] [data-state="open"]')
      .find('div[class*="overflow-y-auto"]')
      .scrollTo("bottom");
    cy.get('[role="dialog"] [data-state="open"]').contains("button", /^i agree$/i).click();

    // Privacy dialog: scroll gate then "I agree"
    cy.contains("button", /^privacy policy$/i).click();
    cy.get('[role="dialog"] [data-state="open"]')
      .find('div[class*="overflow-y-auto"]')
      .scrollTo("bottom");
    cy.get('[role="dialog"] [data-state="open"]').contains("button", /^i agree$/i).click();

    // Core data consent checkbox lives inside a <label> wrapper; click the text to toggle.
    cy.contains(/core data storage/i).click();

    cy.contains("button", /^create my account$/i).should("not.be.disabled").click();

    cy.url({ timeout: 10000 }).should("include", "/dashboard");
  });
});

describe("Login flow", () => {
  before(() => {
    // Ensure test user exists — no-op if already registered
    cy.request({
      method: "POST",
      url: "/api/auth/sign-up/email",
      body: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD, name: "Login E2E" },
      failOnStatusCode: false,
    });
  });

  it("logs in with valid credentials and lands on dashboard", () => {
    cy.visit("/login");
    cy.get('input[type="email"]').type(LOGIN_EMAIL);
    cy.get('input[type="password"]').type(LOGIN_PASSWORD);
    cy.contains("button", /sign in/i).click();

    cy.url({ timeout: 10000 }).should("include", "/dashboard");
  });

  it("shows error on wrong password", () => {
    cy.visit("/login");
    cy.get('input[type="email"]').type(LOGIN_EMAIL);
    cy.get('input[type="password"]').type("WrongPassword!");
    cy.contains("button", /sign in/i).click();

    cy.contains(/invalid email or password/i, { timeout: 5000 }).should("be.visible");
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
    cy.loginViaApi(LOGIN_EMAIL, LOGIN_PASSWORD);
    cy.visit("/dashboard");
    cy.url({ timeout: 10000 }).should("include", "/dashboard");

    // Open the avatar dropdown (the button with aria-haspopup="menu" in the navbar)
    cy.get('[aria-haspopup="menu"]').last().click();
    // Logout option renders as a menu item, not a plain <button>
    cy.contains(/sign out/i).click();
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
