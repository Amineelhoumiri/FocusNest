// Custom Cypress commands

// cy.loginViaApi(email, password) — logs in through the API directly,
// bypassing the UI so E2E tests don't depend on the login form.
// Uses cy.session to cache the auth cookie within a spec run.
// Includes origin header so Better Auth's CSRF origin check passes.
// Retries on 429 (Better Auth sign-in rate limiter triggered by failed
// login attempts in earlier tests).
Cypress.Commands.add("loginViaApi", (email: string, password: string) => {
  cy.session([email], () => {
    const baseUrl = Cypress.config("baseUrl") ?? "";
    const origin = baseUrl.replace(/\/$/, "");
    const attemptLogin = (retriesLeft: number) => {
      cy.request({
        method: "POST",
        url: "/api/auth/sign-in/email",
        body: { email, password },
        headers: { origin },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status === 429 && retriesLeft > 0) {
          cy.wait(4000).then(() => attemptLogin(retriesLeft - 1));
        } else {
          if (res.status !== 200) {
            console.error("[cypress] loginViaApi failed", {
              status: res.status,
              body: res.body,
            });
          }
          expect(res.status, "loginViaApi status").to.eq(200);
        }
      });
    };
    attemptLogin(3);
  });
});

/* Cypress typings augment `Chainable` via a global `namespace`; ESLint disallows namespaces otherwise. */
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      loginViaApi(email: string, password: string): Chainable<void>;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */
