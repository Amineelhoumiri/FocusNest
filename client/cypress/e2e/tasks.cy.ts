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
    // Use onBeforeLoad so gdpr-consent is set before React mounts the CookieBanner
    cy.visit("/tasks", {
      onBeforeLoad: (win) => { win.localStorage.setItem("gdpr-consent", "accepted"); },
    });
    cy.url({ timeout: 10000 }).should("include", "/tasks");
  });

  it("creates a new task and it appears on the board", () => {
    // Intercept the POST so we can wait for it to complete
    cy.intercept("POST", "/api/tasks").as("createTask");

    // Close any open dialog by clicking its backdrop, then open a fresh one
    cy.get("body").then(($body) => {
      const overlay = $body[0].querySelector('.fixed.inset-0.z-50[style*="rgba(0, 0, 0"]');
      if (overlay) (overlay as HTMLElement).click();
    });
    cy.wait(300);

    // Open create task modal/form
    cy.contains("button", /add task/i).then(($btn) => $btn[0].click());

    // Wait for input and type the task name
    cy.get('input[placeholder="Task name"]')
      .should("be.visible")
      .clear()
      .type(TASK_NAME)
      .should("have.value", TASK_NAME);

    cy.contains("button", /create task/i).click();

    // Wait for the API call to finish, then the task should appear
    cy.wait("@createTask").its("response.statusCode").should("be.oneOf", [200, 201]);
    cy.contains(TASK_NAME, { timeout: 8000 }).should("be.visible");
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
