import { ClerkProvider } from "@clerk/nextjs";
import { isPharmacyAuthConfigured } from "@/lib/pharmacy-auth";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  if (!isPharmacyAuthConfigured()) return children;
  return <ClerkProvider appearance={clerkAppearance} signInUrl="/sign-in" signInForceRedirectUrl="/pharmacy" afterSignOutUrl="/" dynamic>{children}</ClerkProvider>;
}
