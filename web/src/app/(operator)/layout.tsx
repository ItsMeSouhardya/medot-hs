import { ClerkProvider } from "@clerk/nextjs";
import { isPharmacyAuthConfigured } from "@/lib/pharmacy-auth";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  if (!isPharmacyAuthConfigured()) return children;
  return <ClerkProvider signInUrl="/sign-in" signInForceRedirectUrl="/pharmacy" afterSignOutUrl="/" dynamic>{children}</ClerkProvider>;
}
