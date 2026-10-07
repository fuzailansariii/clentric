/**
 * Shown for a link that was revoked, has expired, never existed, or whose
 * owner has asked to delete their account.
 *
 * Deliberately says the same thing in every case and names no client,
 * no amount and no freelancer: this renders for anyone who types a URL, so
 * it must not confirm whether a given token was ever real.
 */
export function ProposalUnavailable() {
  return (
    <main className="bg-background text-foreground flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="text-center">
        <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.2em] uppercase">
          Proposal
        </p>
        <h1 className="font-space mt-3 text-xl font-semibold tracking-tight text-balance">
          This link is no longer available.
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-sm leading-relaxed text-pretty">
          The link may have expired or been withdrawn. If you were expecting to
          see something here, reply to the email it came from and ask for a new
          link.
        </p>
      </div>
    </main>
  );
}
