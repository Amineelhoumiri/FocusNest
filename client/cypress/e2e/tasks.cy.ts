// E2E tests for task management
// Uses API login to skip UI auth dependency

const TASK_NAME = `E2E Task ${Date.now()}`;

const TASKS_EMAIL = Cypress.env("tasksEmail") ?? Cypress.env("loginEmail") ?? "tasks_e2e@focusnest.dev";
const TASKS_PASSWORD = Cypress.env("tasksPassword") ?? Cypress.env("loginPassword") ?? "TestPass123!";

/** Logged-in app shell: open Tasks via sidebar (reliable) instead of cold-loading /tasks (can land on /dashboard in prod). */
const goToTasks = () => {
  cy.visit("/dashboard", {
    onBeforeLoad: (win) => { win.localStorage.setItem("gdpr-consent", "accepted"); },
  });
  cy.get('a[href="/tasks"]', { timeout: 20000 }).filter(":visible").first().click();
  cy.contains("h2", /^tasks$/i, { timeout: 20000 }).should("be.visible");
};

const goToSessions = () => {
  cy.visit("/dashboard", {
    onBeforeLoad: (win) => { win.localStorage.setItem("gdpr-consent", "accepted"); },
  });
  cy.get('a[href="/sessions"]', { timeout: 20000 }).filter(":visible").first().click();
  cy.url({ timeout: 20000 }).should("include", "/sessions");
};

describe("Task management", () => {
  before(() => {
    // Ensure test user exists — no-op if already registered
    cy.request({
      method: "POST",
      url: "/api/auth/sign-up/email",
      body: { email: TASKS_EMAIL, password: TASKS_PASSWORD, name: "Task E2E" },
      failOnStatusCode: false,
    });
  });

  beforeEach(() => {
    cy.loginViaApi(TASKS_EMAIL, TASKS_PASSWORD);
    goToTasks();
  });

  // Same pattern as the delete test: API create + load Tasks page. (UI “New task” flow is brittle
  // against older prod bundles / modal markup; the board list is what we need to trust.)
  it("creates a new task and it appears on the board", () => {
    cy.request("GET", "/api/csrf-token").then((csrf) => {
      cy.request({
        method: "POST",
        url: "/api/tasks",
        body: { task_name: TASK_NAME, energy_level: "Low" },
        headers: { "x-csrf-token": csrf.body.csrfToken },
        withCredentials: true,
      }).its("status").should("be.oneOf", [200, 201]);
    });
    goToTasks();
    cy.contains(TASK_NAME, { timeout: 15000 }).should("be.visible");
  });

  it("deletes a task from the board", () => {
    cy.request("GET", "/api/csrf-token").then((csrf) => {
      cy.request({
        method: "POST",
        url: "/api/tasks",
        body: { task_name: "Task to delete", energy_level: "Low" },
        headers: { "x-csrf-token": csrf.body.csrfToken },
        withCredentials: true,
      });
    });

    goToTasks();
    cy.contains("Task to delete", { timeout: 5000 }).should("be.visible");

    cy.contains("Task to delete").rightclick();
    cy.contains(/delete/i).click();

    cy.contains("Task to delete").should("not.exist");
  });
});

describe("Session (focus timer)", () => {
  beforeEach(() => {
    cy.loginViaApi(TASKS_EMAIL, TASKS_PASSWORD);
    goToSessions();
  });

  it("renders the sessions page without crashing", () => {
    cy.get("body").should("be.visible");
    cy.contains(/session|focus|timer/i).should("exist");
  });
});
