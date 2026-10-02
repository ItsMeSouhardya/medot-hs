import { expect, it } from "vitest";
import { findOperatorTag, listOperatorTags, parseTagReference } from "../operator-tags";

it("recovers pending and active tag URLs from stored records", async () => {
  const rows = [
    {
      token: "abcdefghijklmnopqrstuv",
      status: "PENDING" as const,
      generic_name: "Metformin",
      strength: "500 mg",
      dosage_form: "Tablet",
      batch_number: "DEMO-A1",
      expiry_month: "2028-02",
    },
    {
      token: "bcdefghijklmnopqrstuvw",
      status: "ACTIVE" as const,
      generic_name: "Amlodipine",
      strength: "5 mg",
      dosage_form: "Tablet",
      batch_number: "DEMO-B2",
      expiry_month: "2028-03",
    },
  ];
  const tags = await listOperatorTags("https://medot.example", async () => rows);
  expect(tags.map(({ status, url }) => ({ status, url }))).toEqual([
    { status: "PENDING", url: "https://medot.example/m/abcdefghijklmnopqrstuv" },
    { status: "ACTIVE", url: "https://medot.example/m/bcdefghijklmnopqrstuvw" },
  ]);
  expect(tags[0].batchNumber).toBe("DEMO-A1");
});

it("recovers multilingual review text and private creator in authorized operator output", async () => {
  const result = await findOperatorTag("abcdefghijklmnopqrstuv", "https://medot.example", async () => ({
    token: "abcdefghijklmnopqrstuv", status: "PENDING", generic_name: "Paracetamol", strength: "500 mg", dosage_form: "Tablet", batch_number: "DEMO-ONLY", expiry_month: "2028-12",
    brand_name: "Demo brand", instruction: "Demo only.", instruction_bn: "শুধুমাত্র ডেমো।", instruction_hi: "केवल डेमो।", created_by: "verified-operator",
  }));
  expect(result).toMatchObject({ brandName: "Demo brand", instruction: "Demo only.", instructionBn: "শুধুমাত্র ডেমো।", instructionHi: "केवल डेमो।", createdBy: "verified-operator" });
});

it("finds an older tag by its full URL after it leaves the recent list", async () => {
  const origin = "https://medot.example";
  const token = "abcdefghijklmnopqrstuv";
  expect(parseTagReference(origin + "/m/" + token, origin)).toBe(token);
  expect(parseTagReference(token, origin)).toBe(token);
  expect(parseTagReference("https://other.example/m/" + token, origin)).toBeNull();
  const query = async (received: string) => {
    expect(received).toBe(token);
    return {
      token,
      status: "ACTIVE" as const,
      generic_name: "Metformin",
      strength: "500 mg",
      dosage_form: "Tablet",
      batch_number: "DEMO-A1",
      expiry_month: "2028-02",
    };
  };
  const result = await findOperatorTag(token, origin, query);
  expect(result?.status).toBe("ACTIVE");
  expect(result?.url).toBe(origin + "/m/" + token);
});

it.each([
  { instruction: "Software demo.", instruction_bn: "সফটওয়্যার ডেমো।", catalog_status: "DEMO_READY" as const, ready: true },
  { instruction: "Software demo.", instruction_bn: null, catalog_status: "DEMO_READY" as const, ready: false },
  { instruction: "Software demo.", instruction_bn: "সফটওয়্যার ডেমো।", catalog_status: "PACK_CHECK_REQUIRED" as const, ready: false },
  { instruction: "Software demo.", instruction_bn: " ", catalog_status: "DEMO_READY" as const, ready: false },
])("recovers activation readiness without treating legacy or blocked records as ready: $ready", async ({ ready, ...fields }) => {
  const result = await findOperatorTag("abcdefghijklmnopqrstuv", "https://medot.example", async () => ({
    token: "abcdefghijklmnopqrstuv", status: "PENDING", generic_name: "Paracetamol", strength: "500 mg", dosage_form: "Tablet", batch_number: "DEMO-ONLY", expiry_month: "2028-12", ...fields,
  }));
  expect(result?.activationReady).toBe(ready);
});
