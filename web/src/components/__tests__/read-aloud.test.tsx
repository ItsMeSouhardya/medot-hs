// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReadAloud from "../../app/m/[token]/read-aloud";

const token = "abcdefghijklmnopqrstuv";
const record = { token, genericName: "Fresh demo label", strength: "Demo strength", dosageForm: "Demo form", batchNumber: "SOFTWARE-ONLY", expiryMonth: "2028-12", instruction: "Software demonstration only." };
const speak = vi.fn(), cancel = vi.fn();
const response = (body: unknown, status = 200) => ({ ok: status === 200, json: async () => body });
const mount = () => render(<ReadAloud token={token} initialVoice="device" />);
beforeEach(() => {
  vi.stubGlobal("speechSynthesis", { speak, cancel });
  vi.stubGlobal("SpeechSynthesisUtterance", class { text: string; constructor(text: string) { this.text = text; } });
  vi.stubGlobal("fetch", vi.fn(async () => response({ kind: "active", record, expiryState: "CURRENT" })));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("checks the current record and speaks only its server-returned details", async () => {
  mount();
  expect(speak).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  expect(fetch).toHaveBeenCalledWith(`/api/public/tags/${token}`, expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }));
  expect(speak.mock.calls[0][0].text).toContain("Fresh demo label");
  expect(speak.mock.calls[0][0].text).not.toContain("OLD CACHED IDENTITY");
});
it.each(["unknown", "pending", "revoked", "unavailable"])("never speaks stale text after %s resolution", async kind => {
  vi.mocked(fetch).mockResolvedValue(response({ kind }, 503) as Response);
  mount(); fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(speak).not.toHaveBeenCalled();
});
it("uses the current expiry warning at the start of spoken text", async () => {
  vi.mocked(fetch).mockResolvedValue(response({ kind: "active", record: { ...record, expiryMonth: "2000-01" }, expiryState: "EXPIRED" }) as Response);
  mount(); fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  expect(speak.mock.calls[0][0].text).toMatch(/^Warning\./);
});
it("rejects a mismatched token rather than reading another record", async () => {
  vi.mocked(fetch).mockResolvedValue(response({ kind: "active", record: { ...record, token: "different" }, expiryState: "CURRENT" }) as Response);
  mount(); fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(speak).not.toHaveBeenCalled();
});
it("Stop aborts validation and discards a late reply", async () => {
  let finish!: (value: Response) => void;
  vi.mocked(fetch).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  mount(); fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  const stop = screen.getByRole("button", { name: "Stop reading" });
  stop.focus(); fireEvent.click(stop);
  expect((vi.mocked(fetch).mock.calls[0][1]?.signal as AbortSignal).aborted).toBe(true);
  finish(response({ kind: "active", record, expiryState: "CURRENT" }) as Response);
  await waitFor(() => expect(screen.getByText("Reading stopped.")).toBeTruthy());
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Read medicine aloud" })));
  expect(speak).not.toHaveBeenCalled();
});
it("unmount discards validation and cancels existing speech", async () => {
  let finish!: (value: Response) => void;
  vi.mocked(fetch).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = mount(); fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  view.unmount();
  finish(response({ kind: "active", record, expiryState: "CURRENT" }) as Response);
  await Promise.resolve(); await Promise.resolve();
  expect(speak).not.toHaveBeenCalled(); expect(cancel).toHaveBeenCalled();
});
it("checks again before a repeat and refuses a subsequently revoked record", async () => {
  mount(); fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  vi.mocked(fetch).mockResolvedValue(response({ kind: "revoked" }, 410) as Response);
  fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(fetch).toHaveBeenCalledTimes(2); expect(speak).toHaveBeenCalledOnce();
});
it("page hide cancels playback and old utterance callbacks cannot change the stopped status", async () => {
  mount(); fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(speak).toHaveBeenCalledOnce());
  const lateEnd = speak.mock.calls[0][0].onend;
  fireEvent(window, new Event("pagehide"));
  lateEnd();
  expect(screen.getByText("Reading stopped.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Stop reading" })).toBeNull();
});
it("a timeout aborts the request and cannot start late speech", async () => {
  vi.useFakeTimers();
  let finish!: (value: Response) => void;
  vi.mocked(fetch).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  mount(); fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
  expect(screen.getByRole("alert").textContent).toContain("could not be verified");
  expect((vi.mocked(fetch).mock.calls[0][1]?.signal as AbortSignal).aborted).toBe(true);
  await act(async () => { finish(response({ kind: "active", record, expiryState: "CURRENT" }) as Response); });
  expect(speak).not.toHaveBeenCalled();
});
it("a missing speech engine leaves text usable but still verifies the current record", async () => {
  vi.stubGlobal("SpeechSynthesisUtterance", undefined);
  mount(); fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Use your screen reader"));
  expect(fetch).toHaveBeenCalledOnce(); expect(speak).not.toHaveBeenCalled();
});
it("a failed lookup leaves a retry action without speaking cached details", async () => {
  vi.mocked(fetch).mockRejectedValue(new Error("offline"));
  mount(); fireEvent.click(screen.getByRole("button", { name: "Read medicine aloud" }));
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(screen.getByRole("button", { name: "Read medicine aloud" }).hasAttribute("disabled")).toBe(false);
  expect(speak).not.toHaveBeenCalled();
});
