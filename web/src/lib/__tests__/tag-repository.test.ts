import { describe, expect, it, vi } from "vitest";
import { resolveTag, type TagRow } from "../tag-repository";

const token = "abcdefghijklmnopqrstuv";
const row: TagRow = {
  token,
  status: "ACTIVE",
  generic_name: "Metformin",
  strength: "500 mg",
  dosage_form: "Tablet",
  batch_number: "DEMO-A1",
  expiry_month: "2028-02",
  instruction: "Sample instruction",
};

describe("public tag resolution", () => {
  it("does not query for a malformed token", async () => {
    const query = vi.fn(async () => row);
    expect(await resolveTag("bad token", query)).toEqual({ kind: "unknown" });
    expect(query).not.toHaveBeenCalled();
  });

  it("returns no medicine fields for missing, pending, or revoked records", async () => {
    expect(await resolveTag(token, async () => null)).toEqual({ kind: "unknown" });
    expect(await resolveTag(token, async () => ({ ...row, status: "PENDING" })))
      .toEqual({ kind: "pending" });
    expect(await resolveTag(token, async () => ({ ...row, status: "REVOKED" })))
      .toEqual({ kind: "revoked" });
  });

  it("maps only the allowed public fields for an active tag", async () => {
    expect(await resolveTag(token, async () => row)).toEqual({
      kind: "active",
      record: {
        token,
        genericName: "Metformin",
        strength: "500 mg",
        dosageForm: "Tablet",
        batchNumber: "DEMO-A1",
        expiryMonth: "2028-02",
        instruction: "Sample instruction",
      },
    });
  });
});
