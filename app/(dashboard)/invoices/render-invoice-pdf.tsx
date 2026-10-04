import { renderToBuffer } from "@react-pdf/renderer";
import { fetchLogoForPdf } from "@/lib/logo-for-pdf";
import { InvoicePdfDocument } from "./invoice-pdf-document";
import { ModernInvoicePdfDocument } from "./invoice-pdf-modern";
import type { InvoicePdfData } from "./queries";


export async function renderInvoicePdf(
  data: InvoicePdfData,
  showBranding: boolean,
): Promise<Buffer> {
  const logo = await fetchLogoForPdf(data.logoUrl);

  return renderToBuffer(
    data.template === "modern" ? (
      <ModernInvoicePdfDocument
        data={data}
        logo={logo}
        showBranding={showBranding}
        renderedAt={Date.now()}
      />
    ) : (
      <InvoicePdfDocument data={data} logo={logo} showBranding={showBranding} />
    ),
  );
}
