import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getTagSpeech, SpeechError } from "../speech/service";
import { speechHandler } from "../speech/handler";
vi.mock("../speech/service", async original => ({ ...await original<typeof import("../speech/service")>(), getTagSpeech: vi.fn() }));
const token = "abcdefghijklmnopqrstuv", context = { params: Promise.resolve({ token }) };
function request(body = '{"language":"bn"}', origin = "https://medot.example") {
  return new Request("https://medot.example/api/public/tags/" + token + "/speech", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body });
}
beforeEach(() => { vi.stubEnv("APP_ORIGIN", "https://medot.example"); vi.mocked(getTagSpeech).mockResolvedValue({ audio: Uint8Array.of(1, 2), language: "en", usedFallback: true }); });
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it.each(["full", "instructions", "expiry", "details"] as const)("fixed %s handler accepts only a language and emits uncached audio metadata", async kind => {
  const response = await speechHandler(kind)(request(), context);
  expect(response.status).toBe(200); expect(getTagSpeech).toHaveBeenCalledWith(token, "bn", kind);
  expect(response.headers.get("content-type")).toBe("audio/mpeg");
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("x-medot-language")).toBe("en");
  expect(response.headers.get("x-medot-language-fallback")).toBe("true");
});
it.each(['{}', 'null', 'not-json', '{"language":"fr"}', '{"language":"en","text":"arbitrary"}', '{"language":"en","voiceId":"forged"}', '{"language":"en","kind":"details"}', ' '.repeat(257)])("strict input rejects %s before any service call", async body => {
  expect((await speechHandler("full")(request(body), context)).status).toBe(400);
  expect(getTagSpeech).not.toHaveBeenCalled();
});
it("foreign origin and invalid token do not call the speech service", async () => {
  expect((await speechHandler("full")(request(undefined, "https://foreign.example"), context)).status).toBe(403);
  expect((await speechHandler("full")(request(), { params: Promise.resolve({ token: "bad" }) })).status).toBe(404);
  expect(getTagSpeech).not.toHaveBeenCalled();
});
it.each([["UNKNOWN",404],["PENDING",409],["REVOKED",410],["BUDGET",429],["PROVIDER",503],["DATABASE",503],["STALE",503]] as const)("%s preserves status %s without private details", async (code, status) => {
  vi.mocked(getTagSpeech).mockRejectedValue(new SpeechError(code));
  const response = await speechHandler("full")(request(), context);
  expect(response.status).toBe(status); expect(await response.json()).toEqual({ error: code });
  expect(response.headers.get("cache-control")).toContain("no-store");
});
