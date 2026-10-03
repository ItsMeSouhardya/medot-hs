import { afterEach, expect, it, vi } from "vitest";
import { createSpeechService, SpeechError } from "../speech/service";
import { buildSpeechScript } from "../speech/script";
import { synthesizeSpeech } from "../speech/provider";
import type { PublicRecord, TagLookup } from "../tag-repository";

const token = "abcdefghijklmnopqrstuv";
const record: PublicRecord = { token, genericName: "Fictional label", strength: "500 mg", dosageForm: "Tablet", batchNumber: "SOFTWARE-FIXTURE", expiryMonth: "2026-10", instruction: "Exact English sample.", instructionBn: "শুধুমাত্র ডেমো।", infoEn: "Label information.", infoBn: "ডেমো তথ্য।" };
function fixture() {
  const resolve = vi.fn<() => Promise<TagLookup>>(async () => ({ kind: "active", record }));
  const cache = new Map<string, Uint8Array>();
  const read = vi.fn(async (_token: string, _language: string, _kind: string, hash: string) => cache.get(hash) ?? null);
  const put = vi.fn(async (_token: string, _language: string, _kind: string, hash: string, audio: Uint8Array) => { cache.set(hash, audio); });
  const reserve = vi.fn(async () => true), synthesize = vi.fn<typeof synthesizeSpeech>(async () => Uint8Array.of(1, 2, 3));
  let now = new Date("2026-10-31T18:29:59Z");
  const speech = createSpeechService({ resolve, read, put, reserve, synthesize, config: () => ({ model: "eleven_v3", voice: "server_voice", format: "mp3_44100_128" }), now: () => now });
  return { speech, resolve, read, put, reserve, synthesize, advance: () => { now = new Date("2026-10-31T18:30:00Z"); } };
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

it("preserves selected instructions and warns first for every expired kind", () => {
  for (const kind of ["full", "instructions", "expiry", "details"] as const) {
    const script = buildSpeechScript(record, "bn", kind, new Date("2026-11-01"));
    expect(script.language).toBe("bn"); expect(script.usedFallback).toBe(false);
    expect(script.text.startsWith("সতর্কতা")).toBe(true);
    if (kind === "full" || kind === "instructions") expect(script.text).toContain(record.instructionBn);
  }
  expect(buildSpeechScript({ ...record, instructionBn: undefined }, "bn", "full").language).toBe("en");
  expect(buildSpeechScript({ ...record, infoBn: undefined }, "bn", "details")).toMatchObject({ language: "en", usedFallback: true });
});
it("merges concurrent requests, reuses cache and separates kinds and month-end expiry", async () => {
  const f = fixture();
  await Promise.all([f.speech(token, "en", "full"), f.speech(token, "en", "full")]);
  expect(f.synthesize).toHaveBeenCalledOnce(); expect(f.reserve).toHaveBeenCalledOnce();
  await f.speech(token, "en", "full"); expect(f.synthesize).toHaveBeenCalledOnce();
  await f.speech(token, "en", "expiry"); expect(f.synthesize).toHaveBeenCalledTimes(2);
  f.advance(); await f.speech(token, "en", "full"); expect(f.synthesize).toHaveBeenCalledTimes(3);
  expect(f.synthesize.mock.calls.at(-1)?.[0]).toMatchObject({ text: expect.stringMatching(/^Warning/) });
});
it.each(["unknown", "pending", "revoked"] as const)("%s cannot use cached audio or budget", async kind => {
  const f = fixture(); f.resolve.mockResolvedValue({ kind });
  await expect(f.speech(token, "en", "full")).rejects.toMatchObject({ code: kind.toUpperCase() });
  expect(f.read).not.toHaveBeenCalled(); expect(f.reserve).not.toHaveBeenCalled();
});
it("rejects invalid tokens and language and denies quota without a provider call", async () => {
  const f = fixture();
  await expect(f.speech("invalid", "en", "full")).rejects.toBeInstanceOf(SpeechError);
  await expect(f.speech(token, "fr" as "en", "full")).rejects.toMatchObject({ code: "INVALID_INPUT" });
  expect(f.resolve).not.toHaveBeenCalled();
  f.reserve.mockResolvedValue(false);
  await expect(f.speech(token, "en", "full")).rejects.toMatchObject({ code: "BUDGET" });
  expect(f.synthesize).not.toHaveBeenCalled();
});
it("discards cached or generated audio after revocation and a changed instruction", async () => {
  const f = fixture();
  f.synthesize.mockImplementationOnce(async () => { f.resolve.mockResolvedValue({ kind: "revoked" }); return Uint8Array.of(1); });
  await expect(f.speech(token, "en", "full")).rejects.toMatchObject({ code: "REVOKED" });
  expect(f.put).not.toHaveBeenCalled();
  f.resolve.mockResolvedValue({ kind: "active", record }); await f.speech(token, "en", "full");
  f.resolve.mockResolvedValueOnce({ kind: "active", record }).mockResolvedValueOnce({ kind: "revoked" });
  await expect(f.speech(token, "en", "full")).rejects.toMatchObject({ code: "REVOKED" });
});
it("an expiry boundary during generation never returns the earlier un-warned script", async () => {
  const f = fixture(); f.synthesize.mockImplementationOnce(async () => { f.advance(); return Uint8Array.of(1); });
  await expect(f.speech(token, "en", "full")).rejects.toMatchObject({ code: "STALE" });
  expect(f.put).not.toHaveBeenCalled();
});
it("stored instruction or configuration changes during generation discard the old audio", async () => {
  const f = fixture();
  f.synthesize.mockImplementationOnce(async () => { f.resolve.mockResolvedValue({ kind: "active", record: { ...record, instruction: "Changed fixture." } }); return Uint8Array.of(1); });
  await expect(f.speech(token, "en", "full")).rejects.toMatchObject({ code: "STALE" });
  expect(f.put).not.toHaveBeenCalled();
});
it("uses only server model/voice/header and bounds provider bytes", async () => {
  vi.stubEnv("ELEVENLABS_API_KEY", "software-key"); vi.stubEnv("ELEVENLABS_MODEL_ID", "eleven_v3"); vi.stubEnv("ELEVENLABS_VOICE_ID_BN", "serverVoice");
  const fetcher = vi.fn<typeof fetch>(async () => new Response(Uint8Array.of(1, 2), { headers: { "Content-Type": "audio/mpeg" } })); vi.stubGlobal("fetch", fetcher);
  expect(await synthesizeSpeech({ text: "শুধুমাত্র ডেমো।", language: "bn" })).toEqual(Uint8Array.of(1, 2));
  expect(fetcher.mock.calls[0]?.[0]).toContain("/serverVoice?output_format=mp3_44100_128");
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ headers: { "xi-api-key": "software-key" } });
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({ model_id: "eleven_v3", language_code: "bn", text: "শুধুমাত্র ডেমো।" });
  fetcher.mockImplementationOnce(async () => new Response(new Uint8Array(2 * 1024 * 1024 + 1), { headers: { "Content-Type": "audio/mpeg" } }));
  await expect(synthesizeSpeech({ text: "Demo", language: "bn" })).rejects.toMatchObject({ code: "PROVIDER" });
});
it.each([401, 429, 500])("provider %s errors are safe", async status => {
  vi.stubEnv("ELEVENLABS_API_KEY", "software-key"); vi.stubEnv("ELEVENLABS_VOICE_ID_EN", "serverVoice");
  vi.stubGlobal("fetch", vi.fn(async () => new Response("private diagnostic", { status })));
  await expect(synthesizeSpeech({ text: "Demo", language: "en" })).rejects.toMatchObject({ code: "PROVIDER", message: "PROVIDER" });
});
it("the eight-second deadline also ends a hanging provider without retries", async () => {
  vi.useFakeTimers(); vi.stubEnv("ELEVENLABS_API_KEY", "software-key"); vi.stubEnv("ELEVENLABS_VOICE_ID_EN", "serverVoice");
  const fetcher = vi.fn(() => new Promise<Response>(() => {})); vi.stubGlobal("fetch", fetcher);
  const result = expect(synthesizeSpeech({ text: "Demo", language: "en" })).rejects.toMatchObject({ code: "PROVIDER" });
  await vi.advanceTimersByTimeAsync(8000); await result;
  expect(fetcher).toHaveBeenCalledOnce();
});
it("unsafe content type and oversized scripts never become speech", async () => {
  vi.stubEnv("ELEVENLABS_API_KEY", "software-key"); vi.stubEnv("ELEVENLABS_VOICE_ID_EN", "serverVoice");
  const fetcher = vi.fn(async () => new Response("private diagnostic")); vi.stubGlobal("fetch", fetcher);
  await expect(synthesizeSpeech({ text: "Demo", language: "en" })).rejects.toMatchObject({ code: "PROVIDER" });
  await expect(synthesizeSpeech({ text: "x".repeat(2001), language: "en" })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  expect(fetcher).toHaveBeenCalledOnce();
});
