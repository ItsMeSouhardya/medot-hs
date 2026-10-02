import { describe, expect, it } from "vitest";
import {
  createAdminSession,
  hasSameOrigin,
  requireAdmin,
  verifyAdminSession,
} from "../admin-auth";

const secret = "0123456789abcdef0123456789abcdef";

describe("operator session", () => {
  it("accepts a signed session within eight hours", () => {
    const token = createAdminSession(secret, 1_000);
    expect(verifyAdminSession(token, secret, 1_001)).toBe(true);
    expect(verifyAdminSession(token, secret, 1_000 + 8 * 3600)).toBe(true);
    expect(verifyAdminSession(token, secret, 1_000 + 8 * 3600 + 1)).toBe(false);
  });

  it("rejects a forged session without throwing", () => {
    const token = createAdminSession(secret, 1_000);
    expect(verifyAdminSession(token + "x", secret, 1_001)).toBe(false);
    expect(verifyAdminSession("malformed", secret, 1_001)).toBe(false);
  });

  it("requires a valid cookie on protected requests", () => {
    const token = createAdminSession(secret, 1_000);
    const authorized = new Request("https://medot.example/api/admin/medicines", {
      headers: { cookie: "medot_admin=" + token },
    });
    const unauthorized = new Request("https://medot.example/api/admin/medicines");
    expect(requireAdmin(authorized, secret, 1_001)).toBe(true);
    expect(requireAdmin(unauthorized, secret, 1_001)).toBe(false);
  });

  it("rejects a foreign origin for mutations", () => {
    const same = new Request("https://medot.example/api/admin/tags", {
      method: "POST",
      headers: { origin: "https://medot.example" },
    });
    const foreign = new Request("https://medot.example/api/admin/tags", {
      method: "POST",
      headers: { origin: "https://other.example" },
    });
    expect(hasSameOrigin(same)).toBe(true);
    expect(hasSameOrigin(foreign)).toBe(false);
  });
});
