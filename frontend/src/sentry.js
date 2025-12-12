import * as Sentry from "@sentry/browser";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    release: "delineate-frontend@0.1.0",
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
  });
}
