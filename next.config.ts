import type { NextConfig } from "next";

const pdfAssets = ["./assets/fonts/**/*", "./app/apple-icon.png"];

const nextConfig: NextConfig = {
  // Invoice PDFs read their TTF fonts and the Clentric icon from disk at
  // render time. Nothing imports those files, so file tracing can't find
  // them: ship them with the PDF route and with every page whose server
  // actions email a PDF (send invoice, send reminder). Keys are globs, so
  // brackets are escaped.
  outputFileTracingIncludes: {
    "/api/invoices/\\[id\\]/pdf": pdfAssets,
    "/invoices{,/**}": pdfAssets,
    "/clients/**": pdfAssets,
  },
  experimental: {
    // Logo uploads are capped at 1 MB; this leaves room for the form encoding.
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
