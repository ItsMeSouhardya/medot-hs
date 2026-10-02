"use client";

import { SignOutButton, useAuth } from "@clerk/nextjs";

export default function PharmacySignOut() {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) return null;
  return <SignOutButton redirectUrl="/"><button type="button">Sign out</button></SignOutButton>;
}
