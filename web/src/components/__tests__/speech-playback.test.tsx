// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReadAloud from "../../app/m/[token]/read-aloud";
import { interactionPrompts } from "../../data/interaction-prompts";
const token = "abcdefghijklmnopqrstuv";
const record = { token, genericName: "Fictional label", strength: "Fixture", dosageForm: "Fixture", batchNumber: "SOFTWARE", expiryMonth: "2099-12", instruction: "Exact English fixture.", instructionBn: "শুধুমাত্র ডেমো।" };
const active = () => new Response(JSON.stringify({ kind: "active", record, expiryState: "CURRENT" }), { headers: { "Content-Type": "application/json" } });
const audio = () => new Response(Uint8Array.of(1, 2, 3), { headers: { "Content-Type": "audio/mpeg", "X-MEDOT-Language": "en", "X-MEDOT-Language-Fallback": "false" } });
const play = vi.fn<() => Promise<void>>(), pause = vi.fn(), cancel = vi.fn(), speak = vi.fn();
beforeEach(() => {
  play.mockResolvedValue();
  vi.stubGlobal("Audio", class { src = ""; onended: (() => void) | null = null; onerror: (() => void) | null = null; play = play; pause = pause; });
  vi.stubGlobal("speechSynthesis", { cancel, speak, getVoices: () => [{ lang: "en-IN" }] });
  vi.stubGlobal("SpeechSynthesisUtterance", class { text: string; constructor(text: string) { this.text = text; } });
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:software-fixture"); vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(async (_url, options) => options?.method === "POST" ? audio() : active()));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.clearAllMocks(); });
it("reads provider bytes after fresh token validation and never calls browser speech", async () => {
  render(<ReadAloud token={token} />); expect(play).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(play).toHaveBeenCalledOnce());
  expect(fetch).toHaveBeenCalledWith(`/api/public/tags/${token}/speech`, expect.objectContaining({ method: "POST", body: '{"language":"en"}' }));
  expect(speak).not.toHaveBeenCalled();
});
it("autoplay rejection requires another explicit Play gesture, then revalidates", async () => {
  play.mockRejectedValueOnce(new Error("Autoplay"));
  render(<ReadAloud token={token} />); fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  fireEvent.click(await screen.findByRole("button", { name: "Play prepared audio" }));
  await waitFor(() => expect(play).toHaveBeenCalledTimes(2)); expect(speak).not.toHaveBeenCalled();
});
it("provider failure offers device voice explicitly and fresh lookup precedes fallback", async () => {
  vi.mocked(fetch).mockImplementation(async (_url, options) => options?.method === "POST" ? new Response('{"error":"PROVIDER"}', { status: 503 }) : active());
  render(<ReadAloud token={token} />); fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  const fallback = await screen.findByRole("button", { name: "Read with this device's voice" });
  expect(speak).not.toHaveBeenCalled(); fireEvent.click(fallback);
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
});
it("revocation after provider response clears identity callback and refuses playback", async () => {
  let calls = 0;
  vi.mocked(fetch).mockImplementation(async (_url, options) => options?.method === "POST" ? audio() : ++calls === 1 ? active() : new Response('{"kind":"revoked"}', { status: 410 }));
  const onInvalid = vi.fn(); render(<ReadAloud token={token} onInvalid={onInvalid} />);
  fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(onInvalid).toHaveBeenCalled()); expect(play).not.toHaveBeenCalled();
});
it("Stop during provider load discards late bytes and aborts the request", async () => {
  let finish!: (r: Response) => void;
  vi.mocked(fetch).mockImplementation(async (_url, options) => options?.method === "POST" ? new Promise(resolve => { finish = resolve; }) : active());
  render(<ReadAloud token={token} />); fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole("button", { name: "Stop reading" }));
  finish(audio()); await Promise.resolve(); expect(play).not.toHaveBeenCalled();
  expect((vi.mocked(fetch).mock.calls[1][1]?.signal as AbortSignal).aborted).toBe(true);
});
it("rapid language switches and unmount discard late online audio", async () => {
  let finish!: (r: Response) => void;
  vi.mocked(fetch).mockImplementation(async (_url, options) => options?.method === "POST" ? new Promise(resolve => { finish = resolve; }) : active());
  const view = render(<ReadAloud token={token} language="en" />);
  fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  view.rerender(<ReadAloud token={token} language="bn" />);
  await act(async () => finish(audio())); expect(play).not.toHaveBeenCalled();
  view.unmount(); expect(pause).not.toHaveBeenCalled();
});
it("missing Bengali device voice offers explicit English; it never speaks Bengali with an English voice", async () => {
  render(<ReadAloud token={token} language="bn" initialVoice="device" />);
  fireEvent.click(screen.getByRole("button", { name: "ওষুধের তথ্য শুনুন" }));
  // The exact label belongs to the dictionary; the test verifies the explicit
  // language offer rather than inventing a substitute translated instruction.
  const fallback = await screen.findByRole("button", { name: "নথিভুক্ত ইংরেজি ডিভাইসের কণ্ঠে পড়ুন" });
  expect(speak).not.toHaveBeenCalled(); fireEvent.click(fallback);
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  expect(speak.mock.calls[0][0].lang).toBe("en-IN"); expect(speak.mock.calls[0][0].text).toContain(record.instruction);
});
it("refuses an English reading when the listed device voices support only another language", async () => {
  vi.stubGlobal("speechSynthesis", { cancel, speak, getVoices: () => [{ lang: "bn-IN" }] });
  render(<ReadAloud token={token} initialVoice="device" />);
  fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(screen.getByText(/^A device voice for this language is unavailable\./)).toBeTruthy());
  expect(speak).not.toHaveBeenCalled();
});
it("page hide releases prepared provider audio and prevents a later play gesture", async () => {
  play.mockRejectedValueOnce(new Error("Autoplay"));
  render(<ReadAloud token={token} />); fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await screen.findByRole("button", { name: "Play prepared audio" });
  fireEvent(window, new Event("pagehide"));
  expect(screen.queryByRole("button", { name: "Play prepared audio" })).toBeNull();
  expect(pause).toHaveBeenCalled(); expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:software-fixture");
});
it("all labelled commands call their fixed handlers and Repeat interrupts playback", async () => {
  render(<ReadAloud token={token} />);
  for (const [name, suffix] of [["More information", "/details"], ["Is this expired?", "/expiry"], ["Read the instructions again", "/instructions"], ["Repeat", ""]]) {
    fireEvent.click(screen.getByRole("button", { name }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(`/api/public/tags/${token}/speech${suffix}`, expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(screen.getByText("Reading medicine information")).toBeTruthy());
  }
  expect(pause).toHaveBeenCalledTimes(3);
});
it("device finder feedback reads the fresh identity before the fixed verdict cue", async () => {
  render(<ReadAloud token={token} initialVoice="device" feedback={()=>"mismatch"}/>);
  fireEvent.click(screen.getByRole("button",{name:"Read medicine aloud"}));
  await waitFor(()=>expect(speak).toHaveBeenCalledOnce());
  expect(speak.mock.calls[0][0].text).toContain(record.genericName);
  expect(speak.mock.calls[0][0].text.endsWith(interactionPrompts.en.mismatch)).toBe(true);
});
it("online finder feedback revalidates after identity playback before playing the fixed cue", async () => {
  const instances:{src:string;onended:(()=>void)|null;onerror:(()=>void)|null;play:ReturnType<typeof vi.fn>;pause:ReturnType<typeof vi.fn>}[]=[];
  vi.stubGlobal("Audio",class {onended=null;onerror=null;play=vi.fn(async()=>{});pause=vi.fn();constructor(public src:string){instances.push(this);}});
  render(<ReadAloud token={token} feedback={()=>"match"}/>);
  fireEvent.click(screen.getByRole("button",{name:"Read medicine aloud"}));
  await waitFor(()=>expect(instances[0]?.play).toHaveBeenCalledOnce());
  await act(async()=>instances[0].onended?.());
  await waitFor(()=>expect(instances[1]?.play).toHaveBeenCalledOnce());
  expect(instances[1].src).toBe("/audio/prompts/en-match.mp3");
  expect(vi.mocked(fetch).mock.calls.filter(([,options])=>options?.method!=="POST")).toHaveLength(3);
});
it("revocation during identity playback prevents the later verdict cue", async () => {
  const instances:{onended:(()=>void)|null;onerror:(()=>void)|null;play:ReturnType<typeof vi.fn>;pause:ReturnType<typeof vi.fn>;src:string}[]=[];
  vi.stubGlobal("Audio",class {src="";onended=null;onerror=null;play=vi.fn(async()=>{});pause=vi.fn();constructor(){instances.push(this);}});
  const invalid=vi.fn();render(<ReadAloud token={token} feedback={()=>"match"} onInvalid={invalid}/>);
  fireEvent.click(screen.getByRole("button",{name:"Read medicine aloud"}));await waitFor(()=>expect(instances[0]?.play).toHaveBeenCalledOnce());
  vi.mocked(fetch).mockResolvedValueOnce(new Response('{"kind":"revoked"}',{status:410}));
  await act(async()=>instances[0].onended?.());
  await waitFor(()=>expect(invalid).toHaveBeenCalledWith("revoked"));
  expect(instances).toHaveLength(1);
});
