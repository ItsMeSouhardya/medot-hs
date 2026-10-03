import { expect, it } from "vitest";
import { buildProvenance } from "../record-provenance";
import type { PublicRecord } from "../tag-repository";
const record: PublicRecord = { token: "abcdefghijklmnopqrstuv", genericName: "Demo label", strength: "500 mg", dosageForm: "Tablet", batchNumber: "DEMO", expiryMonth: "2028-12", instruction: "Software fixture only." };
it("shows actual creation/activation without inventing pairing evidence for legacy records", () => {
  expect(buildProvenance({ ...record, createdAt: "2026-10-02T10:00:00.000Z", activatedAt: "2026-10-02T10:05:00.000Z" })).toEqual({ verification: "UNAVAILABLE", source: "LEGACY", events: [{ kind: "CREATED", at: "2026-10-02T10:00:00.000Z" }, { kind: "ACTIVATED", at: "2026-10-02T10:05:00.000Z" }] });
});
it("requires explicit supported verification version and a valid recorded date", () => {
  expect(buildProvenance({ ...record, recordKind: "FICTIONAL_DEMO", verificationVersion: 1, verifiedAt: "2026-10-02T10:05:00.000Z" })).toEqual({ verification: "PAIRING_VERIFIED", source: "FICTIONAL_DEMO", events: [{ kind: "PAIRING_VERIFIED", at: "2026-10-02T10:05:00.000Z" }] });
  for (const variant of [{ verificationVersion: 1 }, { verifiedAt: "2026-10-02T10:05:00.000Z" }, { verificationVersion: 99, verifiedAt: "2026-10-02T10:05:00.000Z" }, { verificationVersion: 1, verifiedAt: "not-a-date" }]) {
    expect(buildProvenance({ ...record, ...variant }).verification).toBe("UNAVAILABLE");
  }
});
