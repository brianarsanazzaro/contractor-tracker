/**
 * A URL is only safe to put in an href if it's http(s). Anything else —
 * `javascript:`, `data:`, `vbscript:` — executes in the clicker's session when
 * they click it. Checked on write and again on render, since rows already in
 * the database predate the write-side check.
 */
export function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
