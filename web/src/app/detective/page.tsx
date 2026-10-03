import type { Metadata } from "next";
import MedicationDetective from "@/components/finder/medication-detective";
import { normalizeLanguage } from "@/lib/i18n";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Medication Detective | MEDOT",robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams;
  return <MedicationDetective initialLanguage={normalizeLanguage(params.lang)}/>;
}
