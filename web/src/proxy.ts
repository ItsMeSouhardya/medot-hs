import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { isPharmacyAuthConfigured } from "@/lib/pharmacy-auth";

const initializeSession = clerkMiddleware();

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  // Missing setup must not auto-create a Clerk application or block patients.
  // Every protected handler/page independently denies an unverified session.
  if (!isPharmacyAuthConfigured()) return NextResponse.next();
  return initializeSession(request, event);
}

export const config = {
  matcher: ["/pharmacy/:path*", "/sign-in/:path*", "/api/admin/:path*", "/caregiver/:path*", "/api/caregiver/:path*"],
};
