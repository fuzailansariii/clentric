import "server-only";
import { logError } from "@/lib/errors";
import type { LogoImageType } from "@/lib/logo-file";

const UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const FILES_URL = "https://api.imagekit.io/v1/files";
const UPLOAD_TIMEOUT_MS = 15_000;
const DELETE_TIMEOUT_MS = 10_000;

export class ImageKitUnavailableError extends Error {}

function config() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT?.replace(/\/+$/, "");
  if (!privateKey || !urlEndpoint) return null;
  return { privateKey, urlEndpoint };
}

export function isImageKitConfigured() {
  return config() !== null;
}

function authHeader(privateKey: string) {
  return `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`;
}

export type UploadedLogo = {
  url: string;
  fileId: string;
  width: number;
  height: number;
};

/** Server-side upload with the private key; the browser never talks to ImageKit. */
export async function uploadLogo(
  bytes: Uint8Array,
  type: LogoImageType,
): Promise<UploadedLogo> {
  const settings = config();
  if (!settings) throw new ImageKitUnavailableError("ImageKit is not set up.");

  const extension = type === "jpeg" ? "jpg" : type;
  const form = new FormData();
  form.append(
    "file",
    new Blob([bytes as BlobPart], { type: `image/${type}` }),
    `logo.${extension}`,
  );
  form.append("fileName", `logo.${extension}`);
  form.append("folder", "/logos");
  form.append("useUniqueFileName", "true");
  form.append("isPrivateFile", "false");

  const response = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: authHeader(settings.privateKey) },
    body: form,
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ImageKitUnavailableError(
      `ImageKit upload failed with ${response.status}: ${await response.text()}`,
    );
  }

  const body = (await response.json()) as Partial<UploadedLogo>;
  const { url, fileId, width, height } = body;
  if (
    typeof url !== "string" ||
    typeof fileId !== "string" ||
    typeof width !== "number" ||
    typeof height !== "number" ||
    !url.startsWith(`${settings.urlEndpoint}/`)
  ) {
    if (typeof fileId === "string") await deleteImageKitFile(fileId);
    throw new ImageKitUnavailableError("ImageKit returned an unexpected file.");
  }

  return { url, fileId, width, height };
}

/** Never throws: a leftover file is logged, not shown to the user. */
export async function deleteImageKitFile(fileId: string): Promise<boolean> {
  const settings = config();
  if (!settings || !/^[\w-]+$/.test(fileId)) return false;

  try {
    const response = await fetch(`${FILES_URL}/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: authHeader(settings.privateKey) },
      signal: AbortSignal.timeout(DELETE_TIMEOUT_MS),
      cache: "no-store",
    });
    // 404 means it's already gone, which is what we wanted.
    if (response.ok || response.status === 404) return true;
    logError("deleteImageKitFile", `${response.status} for ${fileId}`);
    return false;
  } catch (error) {
    logError("deleteImageKitFile", error);
    return false;
  }
}
