import { randomBytes } from "node:crypto";
import { z } from "zod";

const tokenPattern = /^[A-Za-z0-9_-]{22}$/;
const expiryMonthPattern = /^([0-9]{4})-(0[1-9]|1[0-2])$/;

export const provisionInputSchema = z.object({
  medicineId: z.string().trim().min(1).max(64),
  batchNumber: z.string().trim().min(1).max(64),
  expiryMonth: z.string().regex(expiryMonthPattern),
  instruction: z.string().trim().min(1).max(500),
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

export function expiryState(month: string, now: Date = new Date()): ExpiryState {
  const match = expiryMonthPattern.exec(month);
  if (!match) throw new Error("Invalid expiry month");
  const expiryValue = Number(match[1]) * 12 + Number(match[2]);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const currentMonth = Number(parts.find((part) => part.type === "month")?.value);
  const currentValue = year * 12 + currentMonth;
  return currentValue > expiryValue ? "EXPIRED" : "CURRENT";
}
