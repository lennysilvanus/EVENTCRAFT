import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Capture 100% of transactions in development, 20% in production.
  // Tune this based on your traffic volume and Sentry plan.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Only enable when a DSN is provided (keeps dev logs clean)
  enabled: !!process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV ?? "development",

  beforeSend(event) {
    // Strip sensitive fields from error payloads before they leave the server
    if (event.request?.cookies) delete event.request.cookies;
    if (event.request?.headers) {
      delete (event.request.headers as Record<string, unknown>)["authorization"];
      delete (event.request.headers as Record<string, unknown>)["cookie"];
    }
    return event;
  },
});
