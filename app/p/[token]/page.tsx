import type { Metadata } from "next";
import { getProposalByToken } from "@/app/(dashboard)/proposals/actions";
import { PublicProposalView } from "./public-proposal-view";
import { ProposalUnavailable } from "./proposal-unavailable";

type PublicProposalPageProps = {
  params: Promise<{ token: string }>;
};

// A proposal link is private by construction — anyone holding it can read
// someone's pricing. It must never end up in a search index.
export const metadata: Metadata = {
  title: "Proposal",
  robots: { index: false, follow: false, nocache: true },
};

// The status changes the moment a client opens or answers it, so this can
// never be served from a cache.
export const dynamic = "force-dynamic";

export default async function PublicProposalPage({
  params,
}: PublicProposalPageProps) {
  const { token } = await params;

  const result = await getProposalByToken(token);

  // getProposalByToken already collapses "never existed", "revoked" and
  // "expired" into one message, so nothing here can be used to probe tokens.
  if (!result.success) {
    return <ProposalUnavailable />;
  }

  return <PublicProposalView proposal={result.data} token={token} />;
}
