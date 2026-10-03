import type { Metadata,Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const manrope = localFont({
  src: "../../public/fonts/manrope.ttf",
  variable: "--font-heading",
  weight: "400 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MEDOT | A small touch. A clearer medicine routine.",
  description: "A tactile NFC clip connecting a medicine strip to accessible pharmacist-recorded information. A hackathon prototype with QR fallback.",
  applicationName: "MEDOT",
};
export const viewport:Viewport={themeColor:"#215c50",colorScheme:"light"};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className={manrope.variable}>{children}</body>
    </html>
  );
}
