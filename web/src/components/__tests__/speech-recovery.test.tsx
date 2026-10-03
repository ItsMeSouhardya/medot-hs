// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReadAloud from "../../app/m/[token]/read-aloud";
import type { RecognitionInstance } from "@/lib/voice/recognition";
const token = "abcdefghijklmnopqrstuv";
const record = { token, genericName: "Fictional label", strength: "Demo", dosageForm: "Fixture", batchNumber: "SOFTWARE", expiryMonth: "2099-12", instruction: "Exact stored instructions.", instructionBn: "শুধুমাত্র ডেমো।" };
const active = () => new Response(JSON.stringify({ kind: "active", record, expiryState: "CURRENT" }));
const speak = vi.fn(), cancel = vi.fn(), resume = vi.fn();
beforeEach(() => {
  vi.stubGlobal("speechSynthesis", { speak, cancel, resume, getVoices: () => [{ lang: "en-IN" }] });
  vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
  vi.stubGlobal("fetch", vi.fn(async () => active()));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.clearAllMocks(); });
it("Read aloud uses browser speech by default without an ElevenLabs request", async () => {
  render(<ReadAloud token={token} />);
  fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  expect(fetch).toHaveBeenCalledOnce();
  expect(speak.mock.calls[0][0].text).toContain(record.instruction);
});
it("an explicitly selected online voice automatically falls back after provider failure", async () => {
  vi.mocked(fetch).mockImplementation(async (_url, options) => options?.method === "POST" ? new Response('{"error":"PROVIDER"}', { status: 503 }) : active());
  const choice = vi.fn(); render(<ReadAloud token={token} initialVoice="online" onVoiceChoice={choice} />);
  fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(choice).toHaveBeenCalledWith("device");
});
it("automatic fallback never reads a record revoked during the provider request", async () => {
  let lookups = 0;
  vi.mocked(fetch).mockImplementation(async (_url, options) => options?.method === "POST" ? new Response('{"error":"PROVIDER"}', { status: 503 }) : ++lookups === 1 ? active() : new Response('{"kind":"revoked"}', { status: 410 }));
  const invalid = vi.fn(); render(<ReadAloud token={token} initialVoice="online" onInvalid={invalid} />);
  fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(invalid).toHaveBeenCalledWith("revoked"));
  expect(speak).not.toHaveBeenCalled();
});
it("resumes a paused speech queue before reading", async () => {
  render(<ReadAloud token={token} initialVoice="device" />);
  fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  expect(resume).toHaveBeenCalled();
});
it("waits for asynchronously loaded Bengali voices instead of giving up after 500ms", async () => {
  vi.useFakeTimers(); const events = new EventTarget(); let voices: { lang: string }[] = [];
  vi.stubGlobal("speechSynthesis", { speak, cancel, resume, getVoices: () => voices, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) });
  render(<ReadAloud token={token} language="bn" initialVoice="device" />);
  fireEvent.click(screen.getByRole("button", { name: "ওষুধের তথ্য শুনুন" }));
  await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
  voices = [{ lang: "bn-IN" }];
  await act(async () => events.dispatchEvent(new Event("voiceschanged")));
  expect(speak).toHaveBeenCalledOnce(); expect(speak.mock.calls[0][0].lang).toBe("bn-IN");
});
it("Listen interrupts playback and a normal voice command reads only stored instructions", async () => {
  const instances: RecognitionInstance[] = []; const start = vi.fn();
  vi.stubGlobal("SpeechRecognition", class { lang = ""; continuous = false; interimResults = false; maxAlternatives = 1; onresult = null; onerror = null; onend = null; start = start; abort = vi.fn(); constructor() { instances.push(this); } });
  render(<ReadAloud token={token} initialVoice="device" />);
  fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  const cancellations = cancel.mock.calls.length;
  const listen = screen.getByRole("button", { name: "Listen for a command" });
  expect(listen.hasAttribute("disabled")).toBe(false); fireEvent.click(listen);
  expect(start).toHaveBeenCalledOnce(); expect(cancel.mock.calls.length).toBeGreaterThan(cancellations);
  act(() => instances[0].onresult?.({ results: [{ isFinal: true, length: 1, 0: { transcript: "Read instructions please" } }] }));
  await waitFor(() => expect(speak).toHaveBeenCalledTimes(2));
  expect(speak.mock.calls[1][0].text).toContain(record.instruction);
  expect(speak.mock.calls[1][0].text).not.toContain(record.batchNumber);
});
it("a native speech error offers a retry and never leaves a permanent playing state", async () => {
  render(<ReadAloud token={token} initialVoice="device" />);
  fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  act(() => speak.mock.calls[0][0].onerror({ error: "not-allowed" }));
  expect(screen.getByRole("button", { name: "Read with this device's voice" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Stop reading" })).toBeNull();
});
it("a silent native engine times out to a retry instead of claiming permanent playback", async () => {
  vi.useFakeTimers(); render(<ReadAloud token={token} initialVoice="device" />);
  fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(speak).toHaveBeenCalledOnce();
  await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
  expect(screen.getByRole("button", { name: "Read with this device's voice" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Stop reading" })).toBeNull();
});
it("a network failure at the online speech endpoint falls back only after fresh validation", async () => {
  vi.mocked(fetch).mockImplementation(async (_url, options) => { if (options?.method === "POST") throw new TypeError("Network failure"); return active(); });
  render(<ReadAloud token={token} initialVoice="online" />);
  fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  expect(fetch).toHaveBeenCalledTimes(3);
});
