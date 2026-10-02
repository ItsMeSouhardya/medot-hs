import { isValidToken } from "./domain";
import { resolveTag } from "./tag-repository";

// Explicit operator configuration identifies a fictional sample, never a random
// existing record. Resolve on every request so revoked samples leave the CTA.
export async function homeDemoHref(
  token: string | undefined = process.env.DEMO_PUBLIC_TOKEN,
  lookup = resolveTag,
): Promise<string> {
  if (!token || !isValidToken(token)) return "#language-preview";
  try {
    const result = await lookup(token);
    if (result.kind === "active" && result.record.token === token) return `/m/${token}`;
  } catch {
    // A homepage preview remains usable while the record service is unavailable.
  }
  return "#language-preview";
}
