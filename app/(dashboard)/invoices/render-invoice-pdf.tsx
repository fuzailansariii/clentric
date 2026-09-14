import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "./invoice-pdf-document";
import type { InvoicePdfData } from "./queries";

/**
 * The one place that actually calls @react-pdf/renderer's renderToBuffer.
 * Used by the download route (`app/api/invoices/[id]/pdf/route.ts`) today,
 * and meant to be imported by the future Resend email-attachment
 * integration too — same render function for both, so the downloaded file
 * and the emailed one can never quietly drift apart into two different PDFs.
 */
export async function renderInvoicePdf(
  data: InvoicePdfData,
  showBranding: boolean,
): Promise<Buffer> {
  return renderToBuffer(
    <InvoicePdfDocument data={data} showBranding={showBranding} />,
  );
}
