import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { hasSameOrigin } from "../request-origin";
const request = (origin?: string) => new Request("http://render-internal:10000/api/admin/tags", {
  method: "POST", headers: origin ? { origin } : {},
});
beforeEach(() => vi.stubEnv("APP_ORIGIN", "https://medot.example"));
afterEach(() => vi.unstubAllEnvs());
it("uses the configured public origin behind a hosting proxy", () => {
  expect(hasSameOrigin(request("https://medot.example"))).toBe(true);
  expect(hasSameOrigin(request("http://render-internal:10000"))).toBe(false);
});
it("rejects missing, foreign and null Origin values", () => {
  for (const origin of [undefined, "null", "https://foreign.example", "https://medot.example.evil.test"]) {
    expect(hasSameOrigin(request(origin))).toBe(false);
  }
});
it.each(["", "bad-url", "https://medot.example/path", "https://medot.example?x=1", "https://user:password@medot.example", "http://medot.example", "https://medot.example#fragment"])("fails closed for invalid APP_ORIGIN %s", (origin) => {
  vi.stubEnv("APP_ORIGIN", origin);
  expect(hasSameOrigin(request("https://medot.example"))).toBe(false);
});
it("allows exact localhost origins during development", () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
  expect(hasSameOrigin(request("http://localhost:3000"))).toBe(true);
  expect(hasSameOrigin(request("http://localhost:3001"))).toBe(false);
});
it("requires HTTPS in production", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
  expect(hasSameOrigin(request("http://localhost:3000"))).toBe(false);
});
