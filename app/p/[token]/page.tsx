import type { Metadata } from "next";
import { cache } from "react";
import { getProposalByToken } from "@/app/(dashboard)/proposals/actions";
import { formatIssuer } from "@/lib/format-issuer";
import { PublicProposalView } from "./public-proposal-view";
import { ProposalUnavailable } from "./proposal-unavailable";

type PublicProposalPageProps = {
  params: Promise<{ token: string }>;
};

// Metadata and the page share one lookup (and one rate-limit hit).
const loadProposal = cache((token: string) => getProposalByToken(token));

// A proposal link is private by construction - anyone holding it can read
// someone's pricing. It must never end up in a search index.
const robots: Metadata["robots"] = { index: false, follow: false, nocache: true };

export async function generateMetadata({
  params,
}: PublicProposalPageProps): Promise<Metadata> {
  const result = await loadProposal((await params).token);
  if (!result.success) return { title: "Proposal", robots };
  const from = formatIssuer(result.data.owner).title;
  return {
    title: `${result.data.title} - proposal from ${from}`,
    description: `Prepared for ${result.data.clientName} by ${from}.`,
    robots,
  };
}

// The status changes the moment a client opens or answers it, so this can
// never be served from a cache.
export const dynamic = "force-dynamic";

export default async function PublicProposalPage({
  params,
}: PublicProposalPageProps) {
  const { token } = await params;

  const result = await loadProposal(token);

  // Unknown tokens get one generic message; a real link says why it closed.
  if (!result.success) {
    return <ProposalUnavailable closed={result.closed} />;
  }

  return <PublicProposalView proposal={result.data} token={token} />;
}
