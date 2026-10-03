import type { Metadata } from "next";
import { normalizeLanguage } from "@/lib/i18n";
import { resolveTag } from "@/lib/tag-repository";
import PatientView, { type PatientLookup } from "@/components/patient/patient-view";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "MEDOT medicine information", robots: { index: false, follow: false } };
type Props = { params: Promise<{ token: string }>; searchParams?: Promise<{ lang?: string }> };
export default async function PatientPage({ params, searchParams }: Props) {
  const [{ token }, search] = await Promise.all([params, searchParams ?? Promise.resolve({ lang: undefined })]);
  let lookup: PatientLookup;
  try { lookup = await resolveTag(token); } catch { lookup = { kind: "unavailable" }; }
  return <PatientView token={token} initialLookup={lookup} initialLanguage={normalizeLanguage(search.lang)} />;
}
