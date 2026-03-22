// Custom Cypress commands

// cy.loginViaApi(email, password) — logs in through the API directly,
// bypassing the UI so E2E tests don't depend on the login form.
Cypress.Commands.add("loginViaApi", (email: string, password: string) => {
  cy.request({
    method: "POST",
    url: "http://localhost:3000/api/auth/sign-in/email",
    body: { email, password },
    failOnStatusCode: false,
  }).then((res) => {
    expect(res.status).to.eq(200);
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginViaApi(email: string, password: string): Chainable<void>;
    }
  }
}
