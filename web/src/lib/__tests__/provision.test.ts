import { describe, expect, it } from "vitest";
import {
  createPendingTag,
  ProvisionError,
  type PendingTag,
  type ProvisionRepository,
} from "../provision";

const input = {
  medicineId: "metformin-500",
  batchNumber: "DEMO-A1",
  expiryMonth: "2028-02",
  instruction: "Sample instruction for testing only",
};

function fakeRepository(exists = true) {
  let inserted: PendingTag | undefined;
  const repository: ProvisionRepository = {
    medicineExists: async () => exists,
    insertPending: async (record) => { inserted = record; },
  };
  return { repository, get inserted() { return inserted; } };
}

describe("pending provisioning", () => {
  it("saves a pending record and returns its one canonical URL", async () => {
    const fake = fakeRepository();
    const result = await createPendingTag(input, fake.repository, "https://medot.example");
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(result.url).toBe("https://medot.example/m/" + result.token);
    expect(fake.inserted).toEqual({ ...input, token: result.token, status: "PENDING" });
  });

  it("rejects an unknown catalog medicine without saving a tag", async () => {
    const fake = fakeRepository(false);
    await expect(createPendingTag(input, fake.repository, "https://medot.example"))
      .rejects.toMatchObject({ code: "UNKNOWN_MEDICINE" });
    expect(fake.inserted).toBeUndefined();
  });

  it("rejects invalid batch, expiry, and instruction before saving", async () => {
    const fake = fakeRepository();
    for (const bad of [
      { ...input, batchNumber: "" },
      { ...input, expiryMonth: "2028-13" },
      { ...input, instruction: " " },
    ]) {
      await expect(createPendingTag(bad, fake.repository, "https://medot.example"))
        .rejects.toBeInstanceOf(ProvisionError);
    }
    expect(fake.inserted).toBeUndefined();
  });
});
