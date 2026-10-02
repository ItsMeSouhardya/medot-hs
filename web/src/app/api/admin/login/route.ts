import { NextResponse } from "next/server";
import {
  adminCookieName,
  adminSessionSeconds,
  createAdminSession,
  getSessionSecret,
  hasSameOrigin,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return new Response("Invalid request origin", { status: 403 });
  }
  const form = await request.formData();
  const password = form.get("password");
  if (typeof password !== "string" || password.length > 1024) {
    return new Response("Invalid login", { status: 400 });
  }
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured) return new Response("Operator login unavailable", { status: 503 });
  if (!verifyAdminPassword(password, configured)) {
    return NextResponse.redirect(new URL("/admin?error=1", request.url), 303);
  }
  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    return new Response("Operator login unavailable", { status: 503 });
  }
  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(adminCookieName, createAdminSession(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: adminSessionSeconds,
  });
  return response;
}
