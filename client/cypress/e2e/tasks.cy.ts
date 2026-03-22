// E2E tests for task management
// Uses API login to skip UI auth dependency

const TASK_NAME = `E2E Task ${Date.now()}`;

describe("Task management", () => {
  before(() => {
    // Ensure test user exists
    cy.request({
      method: "POST",
      url: "http://localhost:3000/api/auth/sign-up/email",
      body: { email: "tasks_e2e@focusnest.dev", password: "TestPass123!", name: "Task E2E" },
      failOnStatusCode: false,
    });
  });

  beforeEach(() => {
    cy.loginViaApi("tasks_e2e@focusnest.dev", "TestPass123!");
    cy.visit("/tasks");
    cy.url({ timeout: 10000 }).should("include", "/tasks");
  });

  it("creates a new task and it appears on the board", () => {
    // Open create task modal/form
    cy.contains("button", /new task|add task|\+/i).click();

    cy.get('input[placeholder*="task" i]').type(TASK_NAME);

    // Select energy level if present
    cy.get("body").then(($body) => {
      if ($body.find('[data-testid="energy-level"]').length) {
        cy.get('[data-testid="energy-level"]').click();
        cy.contains("High").click();
      }
    });

    cy.contains("button", /create|save|add/i).last().click();

    cy.contains(TASK_NAME, { timeout: 5000 }).should("be.visible");
  });

  it("deletes a task from the board", () => {
    // Create a task via API first
    cy.request({
      method: "POST",
      url: "http://localhost:3000/api/tasks",
      body: { task_name: "Task to delete", energy_level: "Low" },
      withCredentials: true,
    });

    cy.reload();
    cy.contains("Task to delete", { timeout: 5000 }).should("be.visible");

    // Open task context or details and delete
    cy.contains("Task to delete").rightclick();
    cy.contains(/delete/i).click();

    cy.contains("Task to delete").should("not.exist");
  });
});

describe("Session (focus timer)", () => {
  beforeEach(() => {
    cy.loginViaApi("tasks_e2e@focusnest.dev", "TestPass123!");
    cy.visit("/sessions");
    cy.url({ timeout: 10000 }).should("include", "/sessions");
  });

  it("renders the sessions page without crashing", () => {
    cy.get("body").should("be.visible");
    cy.contains(/session|focus|timer/i).should("exist");
  });
});
