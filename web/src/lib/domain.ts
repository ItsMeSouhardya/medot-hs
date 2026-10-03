import { randomBytes } from "node:crypto";
import { z } from "zod";
import { usageSlots } from "./usage-slots";
export type { UsageSlot } from "./usage-slots";

const tokenPattern = /^[A-Za-z0-9_-]{22}$/;
const expiryMonthPattern = /^([0-9]{4})-(0[1-9]|1[0-2])$/;

export const provisionInputSchema = z.object({
  medicineId: z.string().trim().min(1).max(64),
  batchNumber: z.string().trim().min(1).max(64),
  expiryMonth: z.string().regex(expiryMonthPattern),
  instruction: z.string().trim().min(1).max(500),
  instructionBn: z.string().trim().min(1).max(500),
  instructionHi: z.string().trim().min(1).max(500).optional(),
  usageSlots: z.array(z.enum(usageSlots)).max(5).refine(slots => new Set(slots).size === slots.length, "Usage slots must be distinct").default([]),
});

export type ProvisionInput = z.infer<typeof provisionInputSchema>;
export type ExpiryState = "CURRENT" | "EXPIRED";

export function isValidToken(token: string): boolean {
  return tokenPattern.test(token);
}

export function generateToken(): string {
  return randomBytes(16).toString("base64url");
}

export function buildTagUrl(token: string, origin: string): string {
  if (!isValidToken(token)) throw new Error("Invalid MEDOT token");
  const base = new URL(origin);
  const local = base.hostname === "localhost" || base.hostname === "127.0.0.1";
  if (base.protocol !== "https:" && !(local && base.protocol === "http:")) {
    throw new Error("MEDOT origin must use HTTPS");
  }
  if (base.pathname !== "/" || base.search || base.hash) {
    throw new Error("MEDOT origin must not contain a path, query, or fragment");
  }
  return new URL("/m/" + token, base).toString();
}

export { expiryState } from "./expiry";
