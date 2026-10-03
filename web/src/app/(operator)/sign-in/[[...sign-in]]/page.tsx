import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { getPharmacyAccess, isPharmacyAuthConfigured } from "@/lib/pharmacy-auth";
import { pharmacyPageDenied } from "@/lib/pharmacy-page-access";
import Link from "next/link";
import MedotLogo from "@/components/brand/medot-logo";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  if (!isPharmacyAuthConfigured()) {
    return (
      <main className="operator-page">
        <Link className="page-brand" href="/" aria-label="MEDOT home"><MedotLogo/></Link>
        <h1>Pharmacy sign-in unavailable</h1>
        <p role="alert">Pharmacy sign-in is not configured yet. Ask the MEDOT team to finish account setup. Medicine tag pages remain available without signing in.</p>
      </main>
    );
  }
  const access = await getPharmacyAccess();
  if (access.kind === "authorized") redirect("/pharmacy");
  if (access.kind === "forbidden") return pharmacyPageDenied(access);
  return (
    <main className="operator-page">
      <Link className="page-brand" href="/" aria-label="MEDOT home"><MedotLogo/></Link>
      <p className="eyebrow">MEDOT pharmacy</p>
      <h1>Sign in to prepare a clip</h1>
      <p>Use your authorized team account. Patient medicine pages do not require sign-in.</p>
      <SignIn routing="path" path="/sign-in" forceRedirectUrl="/pharmacy" withSignUp={false} transferable={false}
        appearance={{ elements: { footerAction: { display: "none" } } }} />
    </main>
  );
}
