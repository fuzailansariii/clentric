/**
 * Turns what people type into a website field ("chenstudio.dev",
 * "www.chen.dev/work", "http://chen.dev") into one full URL. Returns null
 * when it can't be read as a web address.
 */
export function normalizeWebsite(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(value);
  let url: URL;
  try {
    url = new URL(hasScheme ? value : `https://${value}`);
  } catch {
    return null;
  }

  // A bare word ("localhost", "mysite") is almost always a typo here.
  if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) {
    return null;
  }

  // Drop the lone trailing slash URL adds to a bare domain.
  return url.pathname === "/" && !url.search && !url.hash
    ? `${url.protocol}//${url.host}`
    : url.href;
}

/** "https://www.chenstudio.dev/" → "chenstudio.dev", for printing. */
export function formatWebsite(url: string): string {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}
