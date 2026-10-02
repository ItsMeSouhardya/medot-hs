import { describe, expect, it, vi } from "vitest";
import { homeDemoHref } from "../home-demo";
import type { TagLookup } from "../tag-repository";

const token = "abcdefghijklmnopqrstuv";
describe("homepage demo destination", () => {
  it("does not query or guess a token when configuration is absent or malformed", async () => {
    const lookup = vi.fn();
    for (const value of ["", "bad", "https://example.com/m/" + token]) {
      expect(await homeDemoHref(value, lookup)).toBe("#language-preview");
    }
    expect(lookup).not.toHaveBeenCalled();
  });
  it("links only the explicitly configured active record", async () => {
    const lookup = vi.fn(async () => ({ kind: "active", record: { token } }) as TagLookup);
    expect(await homeDemoHref(token, lookup)).toBe("/m/" + token);
    expect(lookup).toHaveBeenCalledWith(token);
  });
  it.each(["pending", "revoked", "unknown"] as const)("keeps %s records out of the demo link", async kind => {
    expect(await homeDemoHref(token, async () => ({ kind }))).toBe("#language-preview");
  });
  it("falls back to the illustration when the database is unavailable", async () => {
    expect(await homeDemoHref(token, async () => { throw Error("unavailable"); })).toBe("#language-preview");
  });
  it("rejects a lookup that returns a different token", async () => {
    expect(await homeDemoHref(token, async () => ({ kind: "active", record: { token: "zyxwvutsrqponmlkjihgfe" } }) as TagLookup)).toBe("#language-preview");
  });
});
