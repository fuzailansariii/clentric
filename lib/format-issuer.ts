import type { IssuerDetails } from "./issuer-snapshot";
import { formatProfession } from "./professions";
import { formatWebsite } from "./format-website";

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
  const lines = [
    businessName ? personName : null,
    formatProfession(issuer.profession),
    // Addresses are typed over several lines; keep them that way.
    ...(issuer.address?.split(/\r?\n/) ?? []),
    issuer.email,
    // Phone is no longer collected or printed; old snapshots still carry it.
    issuer.website ? formatWebsite(issuer.website) : null,
    issuer.taxId ? `Tax ID ${issuer.taxId}` : null,
  ];

  return {
    title: businessName ?? personName ?? issuer.email,
    lines: lines
      .map((line) => line?.trim())
      .filter((line): line is string => Boolean(line)),
  };
}
