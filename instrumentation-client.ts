// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
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

  // Scrub URLs before they leave the browser. This client config matters most:
  // fetch breadcrumbs originate here, and their query strings carry family PII
  // (/api/search?q=<name>, /tasks?tag=<name>). UUID path segments → [id].
  beforeSend(event) {
    return scrubEvent(event);
  },
  beforeBreadcrumb(breadcrumb) {
    return scrubBreadcrumb(breadcrumb);
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
