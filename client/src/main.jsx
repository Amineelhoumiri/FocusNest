import "./instrument.js";
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';

const SentryWrappedApp = Sentry.withErrorBoundary(App, {
  fallback: <div>An error occurred</div>,
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SentryWrappedApp />
  </React.StrictMode>
);