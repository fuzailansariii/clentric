import type { ClosedProposal } from "@/app/(dashboard)/proposals/actions";

const HEADLINE: Record<ClosedProposal["reason"], string> = {
  draft: "This proposal hasn't been sent yet.",
  revoked: "This link is no longer active.",
  expired: "This link has expired.",
};

/**
 * Shown when a link doesn't open. A real link (one someone was given) says
 * why and who to ask; anything else gets the same generic message, so the
 * page can't be used to tell whether a typed-in token ever existed.
 */
export function ProposalUnavailable({ closed }: { closed?: ClosedProposal }) {
  return (
    <main className="bg-muted/30 text-foreground flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="bg-card w-full max-w-md rounded-xl border p-6 text-center shadow-sm">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase">
          Proposal
        </p>
        <h1 className="font-space mt-3 text-xl font-semibold tracking-tight text-balance">
          {closed ? HEADLINE[closed.reason] : "This link is no longer available."}
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-sm leading-relaxed text-pretty">
          {closed
            ? `Ask ${closed.ownerName} to send you a new link.`
            : "The link may have expired or been withdrawn. If you were expecting to see something here, reply to the email it came from and ask for a new link."}
        </p>
      </div>
    </main>
  );
}
