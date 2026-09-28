/**
 * Early Sentry bootstrap (classic script, not a module).
 * Loads before js/app.js so unhandled errors during chunk load are captured.
 * DSN is public client-side; mirrors js/config.js SENTRY_DSN.
 */
(function () {
  var dsn =
    (window.__LUMORA_SENTRY_DSN__ ||
      "https://466326c5da046fdc672078432ca11a3f@o4512166492176384.ingest.us.sentry.io/4512166515179520");
  if (!window.Sentry || !dsn) return;
  try {
    window.Sentry.init({
      dsn: dsn,
      environment: /github\.io$/i.test(location.hostname)
        ? "production"
        : "local",
      release: "lumora-personal-phone@" + (window.__LUMORA_RELEASE__ || "20260929a"),
      tracesSampleRate: 0,
      sendDefaultPii: false,
      ignoreErrors: [
        "ResizeObserver loop limit exceeded",
        "ResizeObserver loop completed with undelivered notifications",
      ],
    });
  } catch (e) {
    console.warn("[sentry] init failed", e);
  }
})();
