import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const pdfAssets = ["./assets/fonts/**/*", "./app/apple-icon.png"];

const isDev = process.env.NODE_ENV === "development";

function originOf(url: string | undefined, fallback: string): string {
  try {
    return url ? new URL(url).origin : fallback;
  } catch {
    return fallback;
  }
}

const supabaseOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL, "");
// Logos load straight from ImageKit (signed URLs, no Next image proxy).
const imagekitOrigin = originOf(
  process.env.IMAGEKIT_URL_ENDPOINT,
  "https://ik.imagekit.io",
);

// Static policy: 'unsafe-inline' scripts are needed by next-themes and Next's
// inline bootstrap. A nonce policy would force every page to render per request.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${imagekitOrigin}`,
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin}${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]),
];

const nextConfig: NextConfig = {
  // Invoice PDFs read their TTF fonts and the Clentric icon from disk at
  // render time. Nothing imports those files, so file tracing can't find
  // them: ship them with the PDF route and with every page whose server
  // actions email a PDF (send invoice, send reminder). Keys are globs, so
  // brackets are escaped.
  outputFileTracingIncludes: {
    "/api/invoices/\\[id\\]/pdf": pdfAssets,
    "/invoices{,/**}": pdfAssets,
    "/clients/**": pdfAssets,
  },
  experimental: {
    // Logo uploads are capped at 1 MB; this leaves room for the form encoding.
    serverActions: { bodySizeLimit: "2mb" },
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Source maps upload only when SENTRY_AUTH_TOKEN is set (on the host's build).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Events go through our own server: CSP stays 'self' and ad blockers can't drop them.
  tunnelRoute: "/monitoring",
  suppressOnRouterTransitionStartWarning: true,
});
