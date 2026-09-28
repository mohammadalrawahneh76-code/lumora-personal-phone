/**
 * Early PostHog bootstrap (classic script, not a module).
 * Project API key is public client-side; mirrors js/config.js POSTHOG_KEY.
 * Autocapture off — pageviews + optional manual capture later.
 */
(function () {
  var key = window.__LUMORA_POSTHOG_KEY__ || "";
  if (!key || typeof window.posthog === "undefined" || !window.posthog.init) return;
  try {
    window.posthog.init(key, {
      api_host: "https://us.i.posthog.com",
      autocapture: false,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      person_profiles: "identified_only",
      loaded: function (ph) {
        try {
          ph.register({
            app: "lumora-personal-phone",
            release: window.__LUMORA_RELEASE__ || "",
          });
        } catch (_) {}
      },
    });
  } catch (e) {
    console.warn("[posthog] init failed", e);
  }
})();
