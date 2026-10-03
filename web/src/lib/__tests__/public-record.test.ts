import { afterEach, expect, it, vi } from "vitest";
import { readCurrentRecord } from "../public-record";
const token = "abcdefghijklmnopqrstuv";
const record = { token, genericName: "Fictional fixture", strength: "Fixture", dosageForm: "Fixture", batchNumber: "SOFTWARE", expiryMonth: "2099-12", instruction: "Software fixture only." };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => vi.unstubAllGlobals());
it("accepts the exact token while removing private fields from the client projection", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => response({ kind: "active", record: { ...record, createdBy: "private", reviewedBy: "private" }, expiryState: "CURRENT" })));
  const signal = new AbortController().signal;
  expect(await readCurrentRecord(token, signal)).toEqual(record);
  expect(fetch).toHaveBeenCalledWith(`/api/public/tags/${token}`, { cache: "no-store", signal });
});
it.each([
  { record: { ...record, token: "zyxwvutsrqponmlkjihgfe" }, expiryState: "CURRENT" },
  { record: { ...record, instruction: undefined }, expiryState: "CURRENT" },
  { record, expiryState: "unexpected" },
])("fails closed on a mismatched or malformed active projection", async body => {
  vi.stubGlobal("fetch", vi.fn(async () => response({ kind: "active", ...body })));
  await expect(readCurrentRecord(token, new AbortController().signal)).rejects.toMatchObject({ kind: "unavailable" });
});
it.each([["revoked", 410], ["pending", 409], ["unknown", 404]] as const)("propagates safe %s state without retaining a supplied identity", async (kind, status) => {
  vi.stubGlobal("fetch", vi.fn(async () => response({ kind, record }, status)));
  await expect(readCurrentRecord(token, new AbortController().signal)).rejects.toMatchObject({ kind });
});
it("treats a mismatched denial status as unavailable", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => response({ kind: "revoked", record }, 200)));
  await expect(readCurrentRecord(token, new AbortController().signal)).rejects.toMatchObject({ kind: "unavailable" });
});
