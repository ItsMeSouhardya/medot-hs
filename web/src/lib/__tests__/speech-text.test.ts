import { expect, it } from "vitest";
import { buildSpokenText } from "../speech-text";
import type { PublicRecord } from "../tag-repository";

const record: PublicRecord = {
  token: "abcdefghijklmnopqrstuv",
  genericName: "Metformin",
  strength: "500 mg",
  dosageForm: "Tablet",
  batchNumber: "DEMO-A1",
  expiryMonth: "2028-02",
  instruction: "Sample instruction for testing only",
};

it("speaks the stored identity, instruction, and labelled expiry", () => {
  const spoken = buildSpokenText(record, false);
  expect(spoken).toContain("Metformin");
  expect(spoken).toContain("500 mg");
  expect(spoken).toContain("DEMO-A1");
  expect(spoken).toContain("Sample instruction for testing only");
  expect(spoken).toContain("February 2028");
  expect(spoken).not.toContain("take two");
});

it("leads an expired record with an explicit warning", () => {
  const spoken = buildSpokenText(record, true);
  expect(spoken.toLowerCase()).toContain("labelled expiry has passed");
  expect(spoken.indexOf("Warning")).toBe(0);
});
