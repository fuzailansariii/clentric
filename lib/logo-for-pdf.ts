import "server-only";
import { logError } from "@/lib/errors";
import { detectLogoType } from "@/lib/logo-file";
import { logoSrc } from "@/lib/logo-url";

const FETCH_TIMEOUT_MS = 3_000;
const MAX_BYTES = 2 * 1024 * 1024;

export type PdfLogo = { data: Buffer; format: "png" };

/** Fetched up front so a slow or down ImageKit drops the logo instead of failing the PDF. */
export async function fetchLogoForPdf(
  url: string | null,
): Promise<PdfLogo | null> {
  if (!url) return null;

  try {
    const response = await fetch(logoSrc(url, "document"), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      logError("fetchLogoForPdf", `${response.status} for ${url}`);
      return null;
    }

    const data = Buffer.from(await response.arrayBuffer());
    if (data.length > MAX_BYTES || detectLogoType(data) !== "png") {
      logError("fetchLogoForPdf", `Unexpected logo body for ${url}`);
      return null;
    }
    return { data, format: "png" };
  } catch (error) {
    logError("fetchLogoForPdf", error);
    return null;
  }
}
