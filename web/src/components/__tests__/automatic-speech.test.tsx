// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReadAloud from "../../app/m/[token]/read-aloud";
import PatientView from "../patient/patient-view";
import type { RecognitionInstance } from "@/lib/voice/recognition";
const token = "abcdefghijklmnopqrstuv";
const record = { token, genericName: "Fictional label", strength: "Demo", dosageForm: "Fixture", batchNumber: "SOFTWARE", expiryMonth: "2099-12", instruction: "Exact stored instructions.", instructionBn: "শুধুমাত্র ডেমো।" };
const active = () => new Response(JSON.stringify({ kind: "active", record, expiryState: "CURRENT" }));
const speak = vi.fn(), cancel = vi.fn(), start = vi.fn(), abort = vi.fn();
let instances: RecognitionInstance[] = [];
beforeEach(() => {
  instances = [];
  vi.stubGlobal("speechSynthesis", { speak, cancel, resume: vi.fn(), getVoices: () => [{ lang: "en-IN" }] });
  vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
  vi.stubGlobal("fetch", vi.fn(async () => active()));
  vi.stubGlobal("SpeechRecognition", class implements RecognitionInstance {
    lang = ""; continuous = false; interimResults = false; maxAlternatives = 1;
    onresult: RecognitionInstance["onresult"] = null; onerror: RecognitionInstance["onerror"] = null; onend: RecognitionInstance["onend"] = null;
    start = start; abort = abort; constructor() { instances.push(this); }
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.clearAllMocks(); });
it("lets Android resolve English when its enumerated voices omit English", async () => {
  vi.stubGlobal("speechSynthesis", { speak, cancel, getVoices: () => [{ lang: "fr-FR" }] });
  render(<ReadAloud token={token} />);
  fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  expect(speak.mock.calls[0][0].lang).toBe("en-IN");
  expect(speak.mock.calls[0][0].voice).toBeUndefined();
});
it("matches Android underscore locale labels", async () => {
  const voice = { lang: "en_IN" };
  vi.stubGlobal("speechSynthesis", { speak, cancel, getVoices: () => [voice] });
  render(<ReadAloud token={token} />);
  fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  expect(speak.mock.calls[0][0].voice).toBe(voice);
});
it("waits for the requested Bengali voice even when other voices are already listed", async () => {
  const engine = new EventTarget(); let voices = [{ lang: "en-IN" }];
  Object.assign(engine, { speak, cancel, getVoices: () => voices }); vi.stubGlobal("speechSynthesis", engine);
  render(<ReadAloud token={token} language="bn" />);
  fireEvent.click(screen.getByRole("button", { name: "ওষুধের তথ্য শুনুন" }));
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  voices = [{ lang: "bn_IN" }]; await act(async () => engine.dispatchEvent(new Event("voiceschanged")));
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  expect(speak.mock.calls[0][0].lang).toBe("bn-IN");
});
it("rechecks revocation after waiting for a device voice before speaking", async () => {
  const engine = new EventTarget(); let voices = [{ lang: "en-IN" }];
  Object.assign(engine, { speak, cancel, getVoices: () => voices }); vi.stubGlobal("speechSynthesis", engine);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(active()).mockResolvedValue(new Response(JSON.stringify({ kind: "revoked" }), { status: 410 })));
  const onInvalid = vi.fn(); render(<ReadAloud token={token} language="bn" onInvalid={onInvalid} />);
  fireEvent.click(screen.getByRole("button", { name: "ওষুধের তথ্য শুনুন" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  voices = [{ lang: "bn-IN" }]; await act(async () => engine.dispatchEvent(new Event("voiceschanged")));
  await waitFor(() => expect(onInvalid).toHaveBeenCalledWith("revoked"));
  expect(speak).not.toHaveBeenCalled(); expect(start).not.toHaveBeenCalled();
});
it("reads automatically once after validation becomes available and keeps the buttons", async () => {
  const onAutoRead = vi.fn();
  const view = render(<ReadAloud token={token} autoRead autoCommands disabled onAutoRead={onAutoRead} />);
  expect(speak).not.toHaveBeenCalled(); expect(start).not.toHaveBeenCalled();
  view.rerender(<ReadAloud token={token} autoRead autoCommands onAutoRead={onAutoRead} />);
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  expect(onAutoRead).toHaveBeenCalledOnce();
  expect(speak.mock.calls[0][0].text).toContain(record.instruction);
  expect(screen.getByRole("button", { name: "Read medicine aloud" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Listen for a command" })).toBeTruthy();
  view.rerender(<ReadAloud token={token} autoRead autoCommands onAutoRead={onAutoRead} />);
  expect(speak).toHaveBeenCalledOnce(); expect(start).not.toHaveBeenCalled();
});
it("listens after speech ends, runs a normal command with fresh data, then listens again", async () => {
  render(<ReadAloud token={token} autoRead autoCommands />);
  await waitFor(() => expect(speak).toHaveBeenCalledOnce()); expect(start).not.toHaveBeenCalled();
  await act(async () => speak.mock.calls[0][0].onend());
  await waitFor(() => expect(start).toHaveBeenCalledOnce());
  await act(async () => instances[0].onresult?.({ results: [{ isFinal: true, length: 1, 0: { transcript: "Read the instructions please" } }] }));
  await waitFor(() => expect(speak).toHaveBeenCalledTimes(2));
  expect(speak.mock.calls[1][0].text).toContain(record.instruction);
  expect(speak.mock.calls[1][0].text).not.toContain(record.genericName); expect(fetch).toHaveBeenCalledTimes(2);
  expect(abort).toHaveBeenCalled(); expect(start).toHaveBeenCalledOnce();
  await act(async () => speak.mock.calls[1][0].onend());
  await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
});
it("Stop before the scheduled automatic reading prevents speech and microphone work", async () => {
  render(<ReadAloud token={token} autoRead autoCommands />);
  fireEvent.click(screen.getByRole("button", { name: "Stop" }));
  await act(async () => new Promise(resolve => setTimeout(resolve, 20)));
  expect(speak).not.toHaveBeenCalled(); expect(start).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});
it("Stop cancels automatic listening without restarting it", async () => {
  render(<ReadAloud token={token} autoRead autoCommands />);
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  await act(async () => speak.mock.calls[0][0].onend());
  await waitFor(() => expect(start).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole("button", { name: "Stop" }));
  expect(abort).toHaveBeenCalled(); expect(instances[0].onresult).toBeNull();
  await act(async () => new Promise(resolve => setTimeout(resolve, 20)));
  expect(start).toHaveBeenCalledOnce(); expect(speak).toHaveBeenCalledOnce();
});
it("a revoked record prevents automatic speech and listening", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ kind: "revoked" }), { status: 410 })));
  const onInvalid = vi.fn(); render(<ReadAloud token={token} autoRead autoCommands onInvalid={onInvalid} />);
  await waitFor(() => expect(onInvalid).toHaveBeenCalledWith("revoked"));
  expect(speak).not.toHaveBeenCalled(); expect(start).not.toHaveBeenCalled();
});
it("speech failure leaves a manual retry and does not open the microphone", async () => {
  render(<ReadAloud token={token} autoRead autoCommands />);
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  await act(async () => speak.mock.calls[0][0].onerror());
  expect(screen.getByRole("button", { name: "Read medicine aloud" }).hasAttribute("disabled")).toBe(false);
  expect(start).not.toHaveBeenCalled();
});
it("does not replay the page automatically on foreground refresh", async () => {
  vi.stubGlobal("fetch", vi.fn(async url => String(url).startsWith("/api/sharing/") ? new Response("{}", { status: 403 }) : active()));
  render(<PatientView token={token} initialLookup={{ kind: "active", record }} initialLanguage="en" />);
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  fireEvent(window, new Event("focus"));
  await waitFor(() => expect(screen.getByRole("button", { name: "Read medicine aloud" }).hasAttribute("disabled")).toBe(false));
  await act(async () => new Promise(resolve => setTimeout(resolve, 20)));
  expect(speak).toHaveBeenCalledOnce();
});
it("Stop also cancels listening scheduled in the gap after audio ends", async () => {
  render(<ReadAloud token={token} autoRead autoCommands />);
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  await act(async () => speak.mock.calls[0][0].onend());
  fireEvent.click(screen.getByRole("button", { name: "Stop" }));
  await act(async () => new Promise(resolve => setTimeout(resolve, 300)));
  expect(start).not.toHaveBeenCalled();
});
it("page hide disposes the automatically opened microphone and ignores late results", async () => {
  render(<ReadAloud token={token} autoRead autoCommands />);
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  await act(async () => speak.mock.calls[0][0].onend());
  await waitFor(() => expect(start).toHaveBeenCalledOnce());
  const late = instances[0].onresult;
  fireEvent(window, new Event("pagehide"));
  await act(async () => late?.({ results: [{ isFinal: true, length: 1, 0: { transcript: "Repeat" } }] }));
  expect(abort).toHaveBeenCalled(); expect(speak).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Listen for a command" }).hasAttribute("disabled")).toBe(false);
});
it("automatic microphone denial does not retry or prevent button instructions", async () => {
  render(<ReadAloud token={token} autoRead autoCommands />);
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  await act(async () => speak.mock.calls[0][0].onend());
  await waitFor(() => expect(start).toHaveBeenCalledOnce());
  await act(async () => instances[0].onerror?.());
  await act(async () => new Promise(resolve => setTimeout(resolve, 300)));
  expect(start).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Listen for a command" }).hasAttribute("disabled")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Read the instructions again" }));
  await waitFor(() => expect(speak).toHaveBeenCalledTimes(2));
});
it("automatic listening expires after ten seconds without restarting", async () => {
  vi.useFakeTimers();
  const view = render(<ReadAloud token={token} autoRead autoCommands />);
  await act(async () => vi.advanceTimersByTimeAsync(1));
  expect(speak).toHaveBeenCalledOnce();
  await act(async () => speak.mock.calls[0][0].onend());
  await act(async () => vi.advanceTimersByTimeAsync(250));
  expect(start).toHaveBeenCalledOnce();
  await act(async () => vi.advanceTimersByTimeAsync(10500));
  expect(abort).toHaveBeenCalledOnce(); expect(start).toHaveBeenCalledOnce();
  expect(instances[0].onresult).toBeNull(); view.unmount();
});
