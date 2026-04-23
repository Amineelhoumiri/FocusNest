// src/main.tsx
// Application entry point. Mounts the React component tree into the DOM.

import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import posthog from "posthog-js";
import App from "./App.tsx";
import { installCsrfFetch } from "./lib/installCsrfFetch";
import "./index.css";

// Sentry — active only when VITE_SENTRY_DSN is set (production)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

// PostHog — active only when VITE_POSTHOG_KEY is set (production)
if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || "https://eu.i.posthog.com",
    capture_pageview: false, // manual pageviews via React Router
    capture_pageleave: true,
    person_profiles: "identified_only",
    session_recording: {
      maskAllInputs: true,         // all <input> / <textarea> fields are masked
      maskInputOptions: {
        text: true,
        search: true,
        email: true,
        password: true,
        textarea: true,
      },
      // Elements marked with class "ph-no-capture" are excluded entirely from recordings.
      // Applied to all user-generated text (task names, chat messages) — see individual components.
    },
  });
}

installCsrfFetch();

createRoot(document.getElementById("root")!).render(<App />);
