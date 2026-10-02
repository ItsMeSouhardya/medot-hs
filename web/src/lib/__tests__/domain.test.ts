import { describe, expect, it } from "vitest";
import {
  buildTagUrl,
  expiryState,
  generateToken,
  provisionInputSchema,
} from "../domain";

describe("MEDOT identity", () => {
  it("creates a nonsequential 22-character URL-safe token", () => {
    const first = generateToken();
    const second = generateToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(first).not.toBe(second);
  });

  it("builds a URL only from a valid token and stable origin", () => {
    expect(buildTagUrl("abcdefghijklmnopqrstuv", "https://medot.example"))
      .toBe("https://medot.example/m/abcdefghijklmnopqrstuv");
    expect(() => buildTagUrl("bad token", "https://medot.example")).toThrow();
    expect(() => buildTagUrl("abcdefghijklmnopqrstuv", "http://medot.example"))
      .toThrow();
    expect(buildTagUrl("abcdefghijklmnopqrstuv", "http://localhost:3000"))
      .toBe("http://localhost:3000/m/abcdefghijklmnopqrstuv");
  });
});

describe("labelled expiry", () => {
  it("stays current until the last instant of the labelled month in India", () => {
    expect(expiryState("2026-09", new Date("2026-09-30T18:29:59Z")))
      .toBe("CURRENT");
    expect(expiryState("2026-09", new Date("2026-09-30T18:30:00Z")))
      .toBe("EXPIRED");
  });

  it("rejects impossible months and empty instructions", () => {
    const base = {
      medicineId: "metformin-500",
      batchNumber: "DEMO-A1",
      expiryMonth: "2028-02",
      instruction: "Sample instruction",
      instructionBn: "ডেমো নির্দেশনা",
    };
    expect(provisionInputSchema.safeParse(base).success).toBe(true);
    expect(provisionInputSchema.safeParse({ ...base, expiryMonth: "2026-13" }).success)
      .toBe(false);
    expect(provisionInputSchema.safeParse({ ...base, expiryMonth: "2026-00" }).success)
      .toBe(false);
    expect(provisionInputSchema.safeParse({ ...base, instruction: "  " }).success)
      .toBe(false);
  });
});

describe("multilingual provision instructions", () => {
  const base = { medicineId: "paracetamol-500", batchNumber: "DEMO-ONLY", expiryMonth: "2028-12", instruction: " Demo instruction ", instructionBn: " ডেমো নির্দেশনা " };
  it("requires English and Bengali, trims each, and keeps Hindi optional", () => {
    expect(provisionInputSchema.parse(base)).toMatchObject({ instruction: "Demo instruction", instructionBn: "ডেমো নির্দেশনা" });
    expect(provisionInputSchema.parse({ ...base, instructionHi: " डेमो निर्देश " })).toMatchObject({ instructionHi: "डेमो निर्देश" });
    const withoutBengali: Partial<typeof base> = { ...base };
    delete withoutBengali.instructionBn;
    expect(provisionInputSchema.safeParse(withoutBengali).success).toBe(false);
  });
  it("rejects blank or oversized variants", () => {
    for (const field of ["instruction", "instructionBn", "instructionHi"]) {
      for (const value of [" ", "x".repeat(501)]) {
        expect(provisionInputSchema.safeParse({ ...base, [field]: value }).success).toBe(false);
      }
      expect(provisionInputSchema.safeParse({ ...base, [field]: "x".repeat(500) }).success).toBe(true);
    }
  });
  it("preserves the event-month expiry boundary in Asia/Kolkata", () => {
    expect(expiryState("2026-10", new Date("2026-10-31T18:29:59Z"))).toBe("CURRENT");
    expect(expiryState("2026-10", new Date("2026-10-31T18:30:00Z"))).toBe("EXPIRED");
  });
});
