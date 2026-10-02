// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import TagWriter from "../tag-writer";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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
