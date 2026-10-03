import type { Metadata } from "next";
import FindMedicine from "@/components/finder/find-medicine";
import { getDemoFindTargets } from "@/lib/finder/demo-targets";
import { normalizeLanguage } from "@/lib/i18n";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Find my medicine | MEDOT",robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const [targets,params]=await Promise.all([getDemoFindTargets(),searchParams]);
  return <FindMedicine initialTargets={targets} initialLanguage={normalizeLanguage(params.lang)}/>;
}
