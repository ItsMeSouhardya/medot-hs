import { z } from "zod";
import { getTagSpeech, SpeechError } from "./service";
import { isValidToken } from "../domain";
import { hasSameOrigin } from "../request-origin";
import type { SpeechKind } from "./types";
const inputSchema = z.object({ language: z.enum(["en", "bn", "hi"]) }).strict();
const headers = { "Cache-Control": "no-store" };
async function input(request: Request): Promise<unknown> {
  if (!request.body) throw new Error("Invalid input");
  const reader = request.body.getReader(); let bytes = 0, body = "";
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 256) throw new Error("Invalid input");
      body += decoder.decode(value, { stream: true });
    }
    return JSON.parse(body + decoder.decode());
  } finally { void reader.cancel().catch(() => {}); }
}
export function speechHandler(kind: SpeechKind) {
  return async (request: Request, { params }: { params: Promise<{ token: string }> }): Promise<Response> => {
    if (!hasSameOrigin(request)) return Response.json({ error: "FORBIDDEN" }, { status: 403, headers });
    const { token } = await params;
    if (!isValidToken(token)) return Response.json({ error: "UNKNOWN" }, { status: 404, headers });
    let parsed;
    try { parsed = inputSchema.safeParse(await input(request)); } catch { return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers }); }
    if (!parsed.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers });
    try {
      const { audio, language, usedFallback } = await getTagSpeech(token, parsed.data.language, kind);
      return new Response(new Uint8Array(audio).buffer, { headers: { ...headers, "Content-Type": "audio/mpeg", "X-MEDOT-Language": language, "X-MEDOT-Language-Fallback": String(usedFallback) } });
    } catch (error) {
      const code = error instanceof SpeechError ? error.code : "DATABASE";
      const status = code === "UNKNOWN" ? 404 : code === "PENDING" ? 409 : code === "REVOKED" ? 410 : code === "BUDGET" ? 429 : code === "INVALID_INPUT" ? 400 : 503;
      return Response.json({ error: code }, { status, headers });
    }
  };
}
