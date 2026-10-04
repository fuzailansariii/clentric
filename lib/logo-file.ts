export const LOGO_MAX_BYTES = 1024 * 1024;
export const LOGO_MIN_SIDE = 64;
export const LOGO_MAX_SIDE = 4000;
export const LOGO_UPLOAD_COOLDOWN_SECONDS = 30;
export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp";

export type LogoImageType = "png" | "jpeg" | "webp";

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte);

/** Reads the file's real type from its first bytes; the name and MIME type can lie. */
export function detectLogoType(bytes: Uint8Array): LogoImageType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "webp";
  }
  return null;
}

/** Size check shared by the picker and the server action. */
export function logoSizeError(size: number): string | null {
  if (size <= 0) return "That file is empty.";
  if (size > LOGO_MAX_BYTES) return "Logo must be 1 MB or smaller.";
  return null;
}

export function logoDimensionsError(width: number, height: number) {
  if (Math.min(width, height) < LOGO_MIN_SIDE) {
    return `Logo must be at least ${LOGO_MIN_SIDE}px on each side.`;
  }
  if (Math.max(width, height) > LOGO_MAX_SIDE) {
    return `Logo must be at most ${LOGO_MAX_SIDE}px on each side.`;
  }
  return null;
}
