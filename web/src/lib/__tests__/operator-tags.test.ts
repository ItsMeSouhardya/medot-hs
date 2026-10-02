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
