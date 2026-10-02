import { SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import type { PharmacyAccess } from "./pharmacy-auth";

export function pharmacyPageDenied(access: Exclude<PharmacyAccess, { kind: "authorized" }>) {
  if (access.kind === "unauthenticated") redirect("/sign-in");
  return (
    <main className="operator-page">
      <h1>Pharmacy access required</h1>
      <p role="alert">This account does not have permission to use the MEDOT pharmacy portal. Ask the team to authorize your account or sign in with an authorized account.</p>
      <SignOutButton redirectUrl="/sign-in"><button type="button">Sign out</button></SignOutButton>
    </main>
  );
}
