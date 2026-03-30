// Custom Cypress commands

// cy.loginViaApi(email, password) — logs in through the API directly,
// bypassing the UI so E2E tests don't depend on the login form.
Cypress.Commands.add("loginViaApi", (email: string, password: string) => {
  // Use the Vite proxy (port 8080) so the auth cookie is set on the same origin
  // that Cypress visits — direct requests to port 3000 would set cookies for a
  // different origin and subsequent page visits would send no credentials.
  cy.request({
    method: "POST",
    url: "http://localhost:8080/api/auth/sign-in/email",
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
