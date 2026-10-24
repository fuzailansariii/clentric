import type { Metadata } from "next";
import { getProposalByToken } from "@/app/(dashboard)/proposals/actions";
import { PublicProposalView } from "./public-proposal-view";
import { ProposalUnavailable } from "./proposal-unavailable";

type PublicProposalPageProps = {
  params: Promise<{ token: string }>;
};

// A private link: never indexed, and a generic title so link previews in
// chat apps don't show the client's name or the project.
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

  // Unknown tokens get one generic message; a real link says why it closed.
  if (!result.success) {
    return <ProposalUnavailable closed={result.closed} />;
  }

  return <PublicProposalView proposal={result.data} token={token} />;
}
