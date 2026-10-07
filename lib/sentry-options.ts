import type * as Sentry from "@sentry/nextjs";
import { scrubText } from "./scrub-error";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Errors only. Cookies, headers and bodies hold session tokens and client data,
// so none of it is sent. Off without a DSN (local dev).
export const sentryOptions: Parameters<typeof Sentry.init>[0] = {
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  tracesSampleRate: 0,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
  },
  // Second net for errors thrown straight from pages, which skip logError().
  beforeSend(event) {
    for (const ex of event.exception?.values ?? []) {
      if (ex.value) ex.value = scrubText(ex.value);
    }
    if (event.message) event.message = scrubText(event.message);
    return event;
  },
};
