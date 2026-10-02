import { afterEach, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch as doesProxyMatch } from "next/experimental/testing/server";
import { NextRequest, type NextFetchEvent } from "next/server";
import proxy, { config } from "../../proxy";

const { initializeSession } = vi.hoisted(() => ({ initializeSession: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ clerkMiddleware: () => initializeSession }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("initializes Clerk only for pharmacy, sign-in and admin APIs", () => {
  for (const url of ["/pharmacy", "/pharmacy/provision", "/pharmacy/tags", "/sign-in", "/sign-in/factor-one", "/api/admin/medicines", "/api/admin/tags/a/activate"]) {
    expect(doesProxyMatch({ config, nextConfig: {}, url })).toBe(true);
  }
  for (const url of ["/", "/m/abcdefghijklmnopqrstuv", "/api/live", "/api/health", "/api/public/tags/a/speech", "/admin", "/_next/static/app.js"]) {
    expect(doesProxyMatch({ config, nextConfig: {}, url })).toBe(false);
  }
});
it("missing configuration cannot trigger Clerk keyless setup", async () => {
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
  vi.stubEnv("CLERK_SECRET_KEY", "");
  const response = await proxy(new NextRequest("http://localhost:3000/pharmacy"), {} as NextFetchEvent);
  expect(response?.headers.get("x-middleware-next")).toBe("1");
  expect(initializeSession).not.toHaveBeenCalled();
});
it("configured protected requests initialize the verified session", () => {
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_fixture");
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_fixture");
  const request = new NextRequest("https://medot.example/pharmacy");
  const event = {} as NextFetchEvent;
  proxy(request, event);
  expect(initializeSession).toHaveBeenCalledWith(request, event);
});
