import { SignIn } from "@clerk/nextjs";
import { isPharmacyAuthConfigured } from "@/lib/pharmacy-auth";
import { redirect } from "next/navigation";
import { caregiverUser } from "@/lib/caregiver/clerk-user";
import Link from "next/link";
import MedotLogo from "@/components/brand/medot-logo";
export const dynamic="force-dynamic";
export default async function CaregiverSignIn(){
  if(!isPharmacyAuthConfigured())return <main className="patient-page"><h1>Caregiver sign-in unavailable</h1><p role="alert">Account setup is required. Public medicine pages remain available.</p></main>;
  if(await caregiverUser())redirect("/caregiver");
  return <main className="patient-page"><Link className="page-brand" href="/" aria-label="MEDOT home"><MedotLogo/></Link><h1>Caregiver sign-in</h1><p>Sign in with your caregiver account, then accept the owner’s private invitation.</p><SignIn routing="path" path="/caregiver/sign-in" forceRedirectUrl="/caregiver" withSignUp={false} transferable={false}/></main>;
}
