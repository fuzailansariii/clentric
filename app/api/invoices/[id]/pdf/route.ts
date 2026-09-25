import { invoiceIdSchema } from "@/app/(dashboard)/invoices/schema";
import { getInvoiceForPdf } from "@/app/(dashboard)/invoices/queries";
import { renderInvoicePdf } from "@/app/(dashboard)/invoices/render-invoice-pdf";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";

// @react-pdf/renderer renders with real Node APIs — not supported on the
// Edge runtime.
export const runtime = "nodejs";

// requireUser() reads the session cookie. Without this, Next tries to
// evaluate the route at build time and fails the same way /projects/new
// used to before unstable_rethrow was added there (see DEV_NOTES.md).
export const dynamic = "force-dynamic";

// TODO(billing): gate this behind the user's plan once Stripe billing
// exists (see DEV_NOTES.md — "Invoice PDF export"). Shipped ungated for
// this milestone: gating on subscriptions.plan today would lock PDF export
// away from every real user, since no subscriptions row can exist without
// a Stripe integration that isn't built yet, and users.plan isn't read for
// gating anywhere else in the app. Revisit which of those two plan fields
// is the real source of truth when billing lands — see the note on the
// duplicate `subscription_plan` enum in users.ts vs subscriptions.ts.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const parsedId = invoiceIdSchema.safeParse(id);
    if (!parsedId.success) {
      return new Response("Invalid invoice ID.", { status: 400 });
    }

    // Fails fast with 401 before touching the database. getInvoiceForPdf()
    // re-checks this itself too — the same defense-in-depth every query in
    // this app already applies, not redundant by accident.
    await requireUser();

    const data = await getInvoiceForPdf(parsedId.data);

    if (!data) {
      // Identical response whether the invoice doesn't exist, was deleted,
      // or belongs to someone else — anything more specific here turns the
      // endpoint into an oracle for which invoice IDs are real.
      return new Response("Invoice not found.", { status: 404 });
    }

    // Always true for now — see the TODO(billing) above. Once plan-gating
    // exists, this becomes that same lookup instead of a literal.
    const showBranding = true;

    const pdf = await renderInvoicePdf(data, showBranding);

    // Built from a DB integer (invoices.invoiceNumber), so it's already
    // just "INV-1042" — stripped anyway, on principle, so nothing about
    // this filename can ever inject a header character.
    const rawFilename = formatInvoiceNumber(
      data.invoice.invoiceNumber,
      data.invoice.numberPrefix,
    );
    const safeFilename = rawFilename.replace(/[^a-zA-Z0-9_-]/g, "") || "invoice";

    // TS's DOM lib doesn't recognize a Node Buffer as BodyInit, even though
    // it works fine at runtime (Buffer is a Uint8Array subclass) — wrapping
    // it satisfies the type without an unsafe cast.
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}.pdf"`,
        // Per-user financial data — must never sit in a shared/CDN cache.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    logError("GET /api/invoices/[id]/pdf", error);

    if (error instanceof AppError && error.code === "UNAUTHENTICATED") {
      return new Response("Unauthorized.", { status: 401 });
    }

    if (error instanceof AppError && error.code === "ACCOUNT_PENDING_DELETION") {
      return new Response("This account is scheduled for deletion.", {
        status: 403,
      });
    }

    // Never the raw error — could be a DB message, a stack trace, etc.
    return new Response("Something went wrong.", { status: 500 });
  }
}
