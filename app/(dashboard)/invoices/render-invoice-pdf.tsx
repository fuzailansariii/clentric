import { renderToBuffer } from "@react-pdf/renderer";
import { fetchLogoForPdf } from "@/lib/logo-for-pdf";
import type { PlanFeatures } from "@/lib/billing/resolve-plan";
import { InvoicePdfDocument } from "./invoice-pdf-document";
import { ModernInvoicePdfDocument } from "./invoice-pdf-modern";
import type { InvoicePdfData } from "./queries";

export async function renderInvoicePdf(
  data: InvoicePdfData,
  features: Pick<PlanFeatures, "clentricBranding" | "customBranding">,
): Promise<Buffer> {
  const logo = features.customBranding ? await fetchLogoForPdf(data.logoUrl) : null;
  const showBranding = features.clentricBranding;

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
