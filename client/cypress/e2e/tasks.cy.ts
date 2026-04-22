// E2E tests for task management
// Uses API login to skip UI auth dependency

const TASK_NAME = `E2E Task ${Date.now()}`;

const TASKS_EMAIL = Cypress.env("tasksEmail") ?? Cypress.env("loginEmail") ?? "tasks_e2e@focusnest.dev";
const TASKS_PASSWORD = Cypress.env("tasksPassword") ?? Cypress.env("loginPassword") ?? "TestPass123!";

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
    cy.visit("/tasks", {
      onBeforeLoad: (win) => { win.localStorage.setItem("gdpr-consent", "accepted"); },
    });
    cy.url({ timeout: 10000 }).should("include", "/tasks");
  });

  it("creates a new task and it appears on the board", () => {
    cy.intercept("POST", "/api/tasks").as("createTask");

    // Wait for the Tasks page to fully render before interacting
    cy.contains("h2", /^tasks$/i, { timeout: 10000 }).should("be.visible");
    cy.contains("button", /new task/i, { timeout: 10000 }).should("be.visible").click();

    cy.get('input[placeholder="Task name"]')
      .should("be.visible")
      .clear()
      .type(TASK_NAME)
      .should("have.value", TASK_NAME);

    cy.contains("button", /create task/i).click();

    cy.wait("@createTask").its("response.statusCode").should("be.oneOf", [200, 201]);
    cy.contains(TASK_NAME, { timeout: 8000 }).should("be.visible");
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

    cy.reload();
    cy.contains("Task to delete", { timeout: 5000 }).should("be.visible");

    cy.contains("Task to delete").rightclick();
    cy.contains(/delete/i).click();

    cy.contains("Task to delete").should("not.exist");
  });
});

describe("Session (focus timer)", () => {
  beforeEach(() => {
    cy.loginViaApi(TASKS_EMAIL, TASKS_PASSWORD);
    cy.visit("/sessions", {
      onBeforeLoad: (win) => { win.localStorage.setItem("gdpr-consent", "accepted"); },
    });
    cy.url({ timeout: 10000 }).should("include", "/sessions");
  });

  it("renders the sessions page without crashing", () => {
    cy.get("body").should("be.visible");
    cy.contains(/session|focus|timer/i).should("exist");
  });
});
