"use client";
import { useEffect,useRef,useState } from "react";
import type { Language } from "@/lib/i18n";
import type { OwnerRecord } from "@/lib/caregiver/types";
import { sharingCopy } from "@/lib/caregiver/copy";
import { privateRequest,usePrivateResource } from "../caregiver/private-client";
import type { UsageSlot } from "@/lib/usage-slots";
export default function ShareIdentification({token,language}:{token:string;language:Language}){
  const state=usePrivateResource<OwnerRecord[]>("/api/sharing/owner-records"),[confirm,setConfirm]=useState(false),[message,setMessage]=useState<"CURRENT_LABEL"|"EXPIRED_LABEL"|null>(null),slotRef=useRef<HTMLSelectElement>(null),copy=sharingCopy[language];
  const record=Array.isArray(state.data)?state.data.find(row=>row.token===token)?.record:undefined,slots:readonly (UsageSlot|"UNCLASSIFIED")[]=record?.usageSlots?.length?record.usageSlots:["UNCLASSIFIED"];
  useEffect(()=>{const clear=()=>{setConfirm(false);setMessage(null);};window.addEventListener("blur",clear);document.addEventListener("visibilitychange",clear);return()=>{window.removeEventListener("blur",clear);document.removeEventListener("visibilitychange",clear);};},[]);
  if(!record)return null;
  return <section className="identification-sharing" aria-label={copy.title}><p>{copy.privacy}</p>{!confirm?<button disabled={state.busy} onClick={()=>{setMessage(null);setConfirm(true);}}>{copy.share}</button>:<><p>{copy.confirmNote}</p><label>{copy.status}<select ref={slotRef}>{slots.map(slot=><option key={slot} value={slot}>{copy.slots[slot]}</option>)}</select></label><button disabled={state.busy} onClick={async()=>{const slot=(slotRef.current?.value??slots[0]) as UsageSlot|"UNCLASSIFIED";setConfirm(false);await state.run(signal=>privateRequest<{outcome:"CURRENT_LABEL"|"EXPIRED_LABEL"}>("/api/sharing/check-ins",signal,"POST",{token,slot}),value=>setMessage(value.outcome));}}>{copy.confirm}</button><button disabled={state.busy} onClick={()=>setConfirm(false)}>{copy.cancel}</button></>}
    {message&&<p role={message==="EXPIRED_LABEL"?"alert":"status"}>{message==="EXPIRED_LABEL"?copy.expired:copy.shared}</p>}
  </section>;
}
