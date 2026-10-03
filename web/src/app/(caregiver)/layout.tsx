import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { isPharmacyAuthConfigured } from "@/lib/pharmacy-auth";
export default function CaregiverLayout({children}:{children:React.ReactNode}){
  if(!isPharmacyAuthConfigured())return children;
  return <ClerkProvider appearance={clerkAppearance} signInUrl="/caregiver/sign-in" signInForceRedirectUrl="/caregiver" afterSignOutUrl="/" dynamic>{children}</ClerkProvider>;
}
