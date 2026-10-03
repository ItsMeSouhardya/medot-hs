"use client";
import { useEffect,useState } from "react";
import type { CaregiverStatus } from "@/lib/caregiver/types";
import { sharingCopy } from "@/lib/caregiver/copy";
import { dictionaries,selectInstruction,type Language } from "@/lib/i18n";
import { privateRequest,usePrivateResource } from "./private-client";
import LanguageControl from "./language-control";
import Link from "next/link";
import MedotLogo from "../brand/medot-logo";
export default function CaregiverDashboard({initialLanguage="en"}:{initialLanguage?:Language}={}){
  const [language,setLanguage]=useState<Language>(initialLanguage),[code,setCode]=useState("");
  const state=usePrivateResource<{id:string;statuses:CaregiverStatus[]}[]>("/api/caregiver/groups"),copy=sharingCopy[language];
  useEffect(()=>{const clear=()=>setCode("");window.addEventListener("blur",clear);document.addEventListener("visibilitychange",clear);return()=>{window.removeEventListener("blur",clear);document.removeEventListener("visibilitychange",clear);};},[]);
  const redeem=async(event:React.FormEvent)=>{event.preventDefault();const entered=code;setCode("");const ok=await state.run(signal=>privateRequest("/api/caregiver/redeem",signal,"POST",{code:entered}));if(ok)await state.refresh();};
  return <main className="patient-page sharing-page" lang={language}><Link className="page-brand" href="/" aria-label="MEDOT"><MedotLogo/></Link><LanguageControl language={language} setLanguage={setLanguage}/><h1>{copy.dashboard}</h1><p>{copy.privacy}</p>
    <form onSubmit={redeem}><label>{copy.code}<input type="password" value={code} onChange={event=>setCode(event.target.value)} minLength={43} maxLength={43} required autoComplete="off" spellCheck={false}/></label><button disabled={state.busy}>{copy.redeem}</button></form>
    {state.busy&&<p role="status">{copy.loading}</p>}{state.error&&<p role="alert">{copy.unavailable}</p>}{!state.data&&!state.busy&&!state.error&&<p>{copy.hidden}</p>}
    {state.data?.length===0&&<p>{copy.noGroups}</p>}{state.data?.map((group,groupIndex)=><section key={group.id} aria-label={`${copy.title} ${groupIndex+1}`}><h2>{copy.title} {groupIndex+1}</h2>{group.statuses.map((status,index)=><article key={index}><h3>{copy.strip} {/^Strip [1-5]$/.test(status.alias)?status.alias.slice(6):index+1}</h3>{!status.available?<p>{copy.unavailableStrip}</p>:<>
      <p>{status.pairingVerified?copy.verified:copy.unverified}</p><ul>{status.slots.map(slot=><li key={slot.slot}><strong>{copy.slots[slot.slot]}</strong>: {slot.state==="SHARED"?copy.identified:slot.state==="OPTIONAL"?copy.optional:copy.noCheckIn}{slot.outcome==="EXPIRED_LABEL"&&<p className="warning">{copy.expired}</p>}</li>)}</ul>
      {status.details&&<><dl><div><dt>{copy.details}</dt><dd>{status.details.genericName} {status.details.strength}</dd></div><div><dt>{dictionaries[language].batch}</dt><dd>{status.details.batchNumber}</dd></div><div><dt>{dictionaries[language].labelledExpiry}</dt><dd>{status.details.expiryMonth}</dd></div><div><dt>{dictionaries[language].recordedInstruction}</dt><dd lang={selectInstruction(status.details,language).language}>{selectInstruction(status.details,language).text}</dd></div></dl><a href={`/m/${status.details.token}`} referrerPolicy="no-referrer">{dictionaries[language].medicine}</a></>}
    </>}</article>)}</section>)}<button disabled={state.busy} onClick={()=>{setCode("");void state.refresh();}}>{copy.refresh}</button>
  </main>;
}
