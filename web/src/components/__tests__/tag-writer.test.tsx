// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import TagWriter from "../tag-writer";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const token = "abcdefghijklmnopqrstuv";
const url = "https://medot.example/m/" + token;
it("requires independent readback even after a successful write and sends the attestation", async () => {
  const write = vi.fn(async () => {});
  vi.stubGlobal("NDEFReader", class { write = write; });
  const fetcher = vi.fn(async () => ({ ok: true, status: 200 }));
  vi.stubGlobal("fetch", fetcher);
  render(<TagWriter token={token} url={url} />);
  fireEvent.click(screen.getByRole("button", { name: "Try writing with this browser" }));
  await screen.findByText("URL written. Close the writer and retap the tag independently.");
  expect(write).toHaveBeenCalledWith({ records: [{ recordType: "url", data: url }] });
  expect(screen.getByRole("button", { name: "Activate verified tag" }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("checkbox", { name: /I retapped/ }));
  fireEvent.click(screen.getByRole("button", { name: "Activate verified tag" }));
  await screen.findByText(/Tag active/);
  expect(fetcher).toHaveBeenCalledWith("/api/admin/tags/" + token + "/activate", expect.objectContaining({ method: "POST", body: JSON.stringify({ verified: true }), headers: { "Content-Type": "application/json" } }));
});
it("refuses legacy incomplete activation and explains how to replace the token", () => {
  render(<TagWriter token={token} url={url} activationReady={false} />);
  fireEvent.click(screen.getByRole("checkbox", { name: /I retapped/ }));
  expect(screen.getByRole("button", { name: "Activate verified tag" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByText(/lacks required reviewed instructions/)).toBeTruthy();
});
it("shows an activation conflict without claiming active and offers fresh saved state", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 409 })));
  render(<TagWriter token={token} url={url} />);
  fireEvent.click(screen.getByRole("checkbox", { name: /I retapped/ }));
  fireEvent.click(screen.getByRole("button", { name: "Activate verified tag" }));
  expect(await screen.findByText(/may have changed/)).toBeTruthy();
  expect(screen.queryByText(/Tag active/)).toBeNull();
  expect(screen.getByRole("link", { name: "Refresh saved state" }).getAttribute("href")).toContain(token);
});
it("revocation is terminal and recovered revoked tags have no writer or activation", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200 })));
  render(<TagWriter token={token} url={url} initialStatus="ACTIVE" />);
  fireEvent.click(screen.getByRole("button", { name: "Revoke this tag" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm revocation" }));
  await screen.findByText("Tag revoked. Issue a new token for corrections.");
  expect(screen.queryByRole("button", { name: "Activate verified tag" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Revoke this tag" })).toBeNull();
  expect(fetch).toHaveBeenCalledOnce();
});
it("a re-write invalidates an earlier readback and cannot overlap a lifecycle request", async () => {
  let finish: () => void = () => {};
  const write = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  vi.stubGlobal("NDEFReader", class { write = write; });
  render(<TagWriter token={token} url={url} />);
  fireEvent.click(screen.getByRole("checkbox", { name: /I retapped/ }));
  fireEvent.click(screen.getByRole("button", { name: "Try writing with this browser" }));
  expect((screen.getByRole("checkbox", { name: /I retapped/ }) as HTMLInputElement).checked).toBe(false);
  expect(screen.getByRole("button", { name: "Activate verified tag" }).hasAttribute("disabled")).toBe(true);
  finish();
  await screen.findByText("URL written. Close the writer and retap the tag independently.");
});

it("keeps activation unavailable after an NFC write failure", async () => {
  const write = vi.fn(async () => { throw new Error("NFC write failed"); });
  vi.stubGlobal("NDEFReader", class { write = write; });
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<TagWriter token="abcdefghijklmnopqrstuv" url="https://medot.example/m/abcdefghijklmnopqrstuv" />);

  fireEvent.click(screen.getByRole("button", { name: "Try writing with this browser" }));

  expect(await screen.findByText("Write failed. This record is still pending.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Activate verified tag" }).hasAttribute("disabled")).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});
