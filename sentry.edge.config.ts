// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { scrubEvent, scrubBreadcrumb } from "@/lib/utils/sentry-scrub";

Sentry.init({
  dsn: "https://6e8390d39f6a6828ff678b26e97e7a58@o4511628977700864.ingest.us.sentry.io/4511628984844288",

  // 10% trace sampling — 1.0 burns quota fast in production.
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
