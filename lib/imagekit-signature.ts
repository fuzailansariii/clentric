import { createHmac } from "node:crypto";

// ImageKit's "no expiry" timestamp: signed into the URL, never sent as ik-t.
const NO_EXPIRY = "9999999999";

/** Signs an ImageKit URL so it works with "Restrict unsigned URLs" turned on. */
export function signImageKitUrl(
  url: string,
  urlEndpoint: string,
  privateKey: string,
): string {
  const endpoint = `${urlEndpoint.replace(/\/+$/, "")}/`;
  if (!url.startsWith(endpoint)) {
    throw new Error("URL is not on the ImageKit endpoint.");
  }

  const signature = createHmac("sha1", privateKey)
    .update(url.slice(endpoint.length) + NO_EXPIRY)
    .digest("hex");
  return `${url}${url.includes("?") ? "&" : "?"}ik-s=${signature}`;
}
