import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SESSION_SECONDS = 8 * 60 * 60;
const COOKIE_NAME = "medot_admin";

export function createAdminSession(
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): string {
  const payload = Buffer.from(
    String(nowSeconds + SESSION_SECONDS) + "." + randomBytes(16).toString("base64url"),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return payload + "." + signature;
}

export function verifyAdminSession(
  token: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  const parts = token.split(".");
  if (parts.length !== 2 || !secret) return false;
  const [payload, signature] = parts;
  if (!payload || !signature) return false;
  const expected = createHmac("sha256", secret).update(payload).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return false;
  }
  const decoded = Buffer.from(payload, "base64url").toString("utf8");
  const expiry = Number(decoded.split(".")[0]);
  return Number.isSafeInteger(expiry) && expiry >= nowSeconds;
}

export function verifyAdminPassword(submitted: string, configured: string): boolean {
  if (!configured) return false;
  const submittedHash = createHash("sha256").update(submitted).digest();
  const configuredHash = createHash("sha256").update(configured).digest();
  return timingSafeEqual(submittedHash, configuredHash);
}

export function requireAdmin(
  request: Request,
  secret: string = process.env.SESSION_SECRET ?? "",
  nowSeconds?: number,
): boolean {
  const cookie = request.headers.get("cookie")?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(COOKIE_NAME + "="));
  const token = cookie?.slice(COOKIE_NAME.length + 1);
  return token ? verifyAdminSession(token, secret, nowSeconds) : false;
}

export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return secret;
}

export const adminCookieName = COOKIE_NAME;
export const adminSessionSeconds = SESSION_SECONDS;
