import "server-only";
import { logError } from "@/lib/errors";
import { signImageKitUrl } from "@/lib/imagekit-signature";

const TRANSFORMS = {
  // ImageKit picks WebP/AVIF for browsers that take it.
  web: "w-320,h-128,c-at_max",
  // PNG for PDFs and email clients, which can't all read WebP.
  document: "w-480,h-192,c-at_max,f-png",
} as const;

export type LogoSize = keyof typeof TRANSFORMS;

/** Signed, so with "Restrict unsigned URLs" on nobody can request other sizes. */
export function logoSrc(url: string, size: LogoSize = "web"): string {
  const transformed = `${url}?tr=${TRANSFORMS[size]}`;
  const endpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!endpoint || !privateKey) {
    logError("logoSrc", "IMAGEKIT_* env vars are not set; logo URL left unsigned.");
    return transformed;
  }
  try {
    return signImageKitUrl(transformed, endpoint, privateKey);
  } catch (error) {
    // e.g. the endpoint changed after upload: the page falls back to initials.
    logError("logoSrc", error);
    return transformed;
  }
}
