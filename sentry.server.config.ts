// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { scrubEvent, scrubBreadcrumb } from "@/lib/utils/sentry-scrub";

Sentry.init({
  dsn: "https://6e8390d39f6a6828ff678b26e97e7a58@o4511628977700864.ingest.us.sentry.io/4511628984844288",

  // 10% trace sampling — 1.0 burns quota fast in production. Raise temporarily
  // when debugging a specific performance issue.
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // PII off (audit H1): Vigilight handles grieving families' data — never ship
  // IPs, cookies, headers, or user context to Sentry by default.
  sendDefaultPii: false,

  // Scrub URLs (query strings carry search terms / tag names; UUID segments →
  // [id]) from events and breadcrumbs before they leave the app.
  beforeSend(event) {
    return scrubEvent(event);
  },
  beforeBreadcrumb(breadcrumb) {
    return scrubBreadcrumb(breadcrumb);
  },
});
