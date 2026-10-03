"use client";
import { useEffect,useState } from "react";
import type { OwnerRecord } from "@/lib/caregiver/types";
import { sharingCopy } from "@/lib/caregiver/copy";
import type { Language } from "@/lib/i18n";
import { findOptionsSchema,type FindOption } from "@/lib/finder/types";
import { usePrivateResource } from "../caregiver/private-client";
export default function OwnerChoices({language,onChoices}:{language:Language;onChoices:(choices:FindOption[])=>void}){
  const [enabled,setEnabled]=useState(false),state=usePrivateResource<OwnerRecord[]>("/api/sharing/owner-records",enabled),copy=sharingCopy[language];
  useEffect(()=>{const parsed=findOptionsSchema.safeParse(Array.isArray(state.data)?state.data.map(({record})=>({medicineId:record.medicineId,genericName:record.genericName,strength:record.strength,dosageForm:record.dosageForm,...(record.brandName?{brandName:record.brandName}:{})})):null);onChoices(parsed.success?parsed.data:[]);},[state.data,onChoices]);
  return <section><button type="button" disabled={state.busy} onClick={()=>{if(enabled)void state.refresh();else setEnabled(true);}}>{copy.finder}</button>{state.error&&<p role="alert">{copy.unavailable}</p>}</section>;
}
