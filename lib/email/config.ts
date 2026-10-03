import "server-only";
import { LEGAL } from "@/lib/legal-config";

export function emailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY ?? null,
    fromAddress: process.env.EMAIL_FROM ?? `noreply@${LEGAL.domain}`,
    supportEmail: process.env.SUPPORT_EMAIL ?? LEGAL.supportEmail,
    // From config, never the request's Host header: a spoofed host would put
    // someone else's domain into a link we email from ours.
    appUrl: (process.env.APP_URL ?? LEGAL.siteUrl).replace(/\/+$/, ""),
  };
}
