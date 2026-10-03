// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import VoiceControls from "../patient/voice-controls";
import type { RecognitionInstance } from "@/lib/voice/recognition";
import { dictionaries } from "@/lib/i18n";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
function recognition() {
  const instances: RecognitionInstance[] = [], start = vi.fn(), abort = vi.fn();
  class Fake implements RecognitionInstance {
    lang = ""; continuous = false; interimResults = false; maxAlternatives = 1;
    onresult: RecognitionInstance["onresult"] = null; onerror: RecognitionInstance["onerror"] = null; onend: RecognitionInstance["onend"] = null;
    constructor() { instances.push(this); } start = start; abort = abort;
  }
  vi.stubGlobal("SpeechRecognition", Fake);
  return { instances, start, abort };
}
it("recognition ending without a result clears the listening indicator", () => {
  const f = recognition(); render(<VoiceControls language="en" busy={false} onCommand={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Listen for a command" }));
  act(() => f.instances[0].onend?.());
  expect(screen.queryByText(dictionaries.en.listening)).toBeNull();
  expect(screen.getByRole("button", { name: "Listen for a command" }).hasAttribute("disabled")).toBe(false);
});
it("a browser recognition constructor failure leaves the controls usable", () => {
  vi.stubGlobal("SpeechRecognition", class { constructor() { throw new Error("Recognition service disabled"); } });
  render(<VoiceControls language="en" busy={false} onCommand={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Listen for a command" }));
  expect(screen.getByText(dictionaries.en.recognitionFailed)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Listen for a command" }).hasAttribute("disabled")).toBe(false);
});
it("buttons remain useful without recognition and loading never starts the microphone", () => {
  const f = recognition(), command = vi.fn(); render(<VoiceControls language="en" busy={false} onCommand={command} />);
  expect(f.start).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Is this expired?" })); expect(command).toHaveBeenCalledWith("EXPIRY");
  expect(screen.getByText(/browser's recognition service/)).toBeTruthy();
});
it("only an explicit Listen starts one bounded final-result recognition, then drops late results", () => {
  vi.useFakeTimers(); const f = recognition(), command = vi.fn(); render(<VoiceControls language="en" busy={false} onCommand={command} />);
  fireEvent.click(screen.getByRole("button", { name: "Listen for a command" })); expect(f.start).toHaveBeenCalledOnce();
  const late = f.instances[0].onresult;
  f.instances[0].onresult?.({ results: [{ isFinal: true, length: 1, 0: { transcript: "Repeat" } }] });
  expect(command).toHaveBeenCalledWith("REPEAT");
  late?.({ results: [{ isFinal: true, length: 1, 0: { transcript: "More information" } }] });
  expect(command).toHaveBeenCalledTimes(1);
});
it("busy, language change, timeout, hide, unmount and Stop end listening", () => {
  vi.useFakeTimers(); const f = recognition(), command = vi.fn(); const view = render(<VoiceControls language="en" busy={false} onCommand={command} />);
  fireEvent.click(screen.getByRole("button", { name: "Listen for a command" }));
  view.rerender(<VoiceControls language="bn" busy={true} onCommand={command} />);
  expect(f.abort).toHaveBeenCalled(); expect(f.instances[0].onresult).toBeNull();
  expect(screen.getByRole("button", { name: "একটি নির্দেশ শুনুন" }).hasAttribute("disabled")).toBe(true);
  view.rerender(<VoiceControls language="en" busy={false} onCommand={command} />);
  fireEvent.click(screen.getByRole("button", { name: "Listen for a command" }));
  vi.advanceTimersByTime(10000); expect(f.abort).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "Listen for a command" }));
  fireEvent.click(screen.getByRole("button", { name: "Stop" })); expect(command).toHaveBeenCalledWith("STOP");
  view.unmount(); expect(f.instances.at(-1)?.onresult).toBeNull();
});
it("an absent recognition service leaves labelled commands usable", () => {
  vi.stubGlobal("SpeechRecognition", undefined); vi.stubGlobal("webkitSpeechRecognition", undefined);
  const command = vi.fn(); render(<VoiceControls language="en" busy={false} onCommand={command} />);
  fireEvent.click(screen.getByRole("button", { name: "Listen for a command" }));
  expect(screen.getByText(dictionaries.en.recognitionUnavailable)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "More information" })); expect(command).toHaveBeenCalledWith("DETAILS");
});
it("microphone denial disposes recognition without disabling command buttons", () => {
  const f = recognition(), command = vi.fn(); render(<VoiceControls language="en" busy={false} onCommand={command} />);
  fireEvent.click(screen.getByRole("button", { name: "Listen for a command" }));
  act(() => f.instances[0].onerror?.());
  expect(screen.getByText(dictionaries.en.recognitionFailed)).toBeTruthy();
  expect(f.abort).toHaveBeenCalledOnce(); expect(f.instances[0].onresult).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Read the instructions again" })); expect(command).toHaveBeenCalledWith("INSTRUCTIONS");
});
it("page hide and Stop clear listening status and ignore late microphone results", () => {
  const f = recognition(), command = vi.fn(); render(<VoiceControls language="en" busy={false} onCommand={command} />);
  fireEvent.click(screen.getByRole("button", { name: "Listen for a command" }));
  const late = f.instances[0].onresult;
  fireEvent(window, new Event("pagehide"));
  expect(screen.queryByText(dictionaries.en.listening)).toBeNull();
  late?.({ results: [{ isFinal: true, length: 1, 0: { transcript: "Repeat" } }] });
  expect(command).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Listen for a command" }));
  fireEvent.click(screen.getByRole("button", { name: "Stop" }));
  expect(screen.queryByText(dictionaries.en.listening)).toBeNull();
});
