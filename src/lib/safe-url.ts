/**
 * Returns the URL only if it uses an http(s) scheme.
 * Prevents javascript:, data:, vbscript: protocol injection in href attributes.
 */
export function safeHttpUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : undefined;
}
