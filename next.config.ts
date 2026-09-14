import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The invoice PDF reads its TTF fonts from disk at render time
  // (app/(dashboard)/invoices/invoice-pdf-fonts.ts). Nothing imports those
  // files, so the build's file tracing can't discover them — ship them with
  // the PDF route explicitly. Brackets are escaped: keys are glob patterns.
  outputFileTracingIncludes: {
    "/api/invoices/\\[id\\]/pdf": ["./assets/fonts/**/*"],
  },
};

export default nextConfig;
