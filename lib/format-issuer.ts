import type { IssuerDetails } from "./issuer-snapshot";
import { formatProfession } from "./professions";
import { formatWebsite } from "./format-website";
import { countryName } from "./countries";

/**
 * The "From" block every document prints, so the invoice page, the PDF and
 * the public proposal page agree on order and wording. The business name
 * leads when there is one, with the person's name under it.
 *
 * Kept apart from issuer-snapshot.ts so client components can use it
 * without pulling Drizzle into the browser bundle.
 */
export function formatIssuer(issuer: IssuerDetails): {
  title: string;
  lines: string[];
} {
  const personName = issuer.name?.trim() || null;
  const businessName = issuer.businessName?.trim() || null;
  // Kept short on purpose: no address, tax ID or phone, even when stored.
  const lines = [
    businessName ? personName : null,
    formatProfession(issuer.profession),
    issuer.email,
    issuer.website ? formatWebsite(issuer.website) : null,
    countryName(issuer.country),
  ];

  return {
    title: businessName ?? personName ?? issuer.email,
    lines: lines
      .map((line) => line?.trim())
      .filter((line): line is string => Boolean(line)),
  };
}
