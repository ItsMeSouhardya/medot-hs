"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import type { OwnerControls } from "@/lib/caregiver/types";
import type { Language } from "@/lib/i18n";
import { sharingCopy } from "@/lib/caregiver/copy";
import { privateRequest,usePrivateResource } from "./private-client";
import LanguageControl from "./language-control";
import MedotLogo from "../brand/medot-logo";
export default function SharingControls({initialLanguage="en"}:{initialLanguage?:Language}={}){
  const [language,setLanguage]=useState<Language>(initialLanguage),[code,setCode]=useState(""),[invitation,setInvitation]=useState("");
  const state=usePrivateResource<OwnerControls>("/api/sharing/consent"),copy=sharingCopy[language];
  useEffect(()=>{const clear=()=>{setCode("");setInvitation("");};window.addEventListener("blur",clear);document.addEventListener("visibilitychange",clear);return()=>{window.removeEventListener("blur",clear);document.removeEventListener("visibilitychange",clear);};},[]);
  const execute=async(method:string,url:string,body:unknown)=>{setInvitation("");const ok=await state.run(signal=>privateRequest(url,signal,method,body));if(ok)await state.refresh();};
  const unlock=async(event:React.FormEvent)=>{event.preventDefault();const entered=code;setCode("");await execute("POST","/api/sharing/session",{code:entered});};
  const save=async(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!state.data)return;const form=new FormData(event.currentTarget),enabled=form.get("status")==="on";
    await execute("POST","/api/sharing/consent",{enabled,scopes:{status:enabled,details:enabled&&form.get("details")==="on"},selectedTokens:enabled?form.getAll("token"):[],expectedVersion:state.data.version});};
  const disable=async()=>{if(!state.data)return;await execute("POST","/api/sharing/consent",{enabled:false,scopes:{status:false,details:false},selectedTokens:[],expectedVersion:state.data.version});};
  const invite=async(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();const details=new FormData(event.currentTarget).get("details")==="on";await state.run(signal=>privateRequest<{code:string}>("/api/sharing/invites",signal,"POST",{scopes:{status:true,details}}),value=>setInvitation(value.code));};
  // Secrets remain only in memory and are cleared with the private session UI.
  const visibleInvitation=state.data&&state.data.enabled?invitation:"";
  return <main className="patient-page sharing-page" lang={language}><Link className="page-brand" href="/" aria-label="MEDOT"><MedotLogo/></Link><LanguageControl language={language} setLanguage={value=>{setCode("");setInvitation("");setLanguage(value);}}/><h1>{copy.title}</h1><p>{copy.privacy}</p>
    {state.busy&&<p role="status">{copy.loading}</p>}{state.error&&<p role="alert">{copy.unavailable}</p>}
    {!state.data?<form onSubmit={unlock}><label>{copy.ownerCode}<input value={code} onChange={event=>setCode(event.target.value)} autoComplete="off" spellCheck={false} type="password" minLength={43} maxLength={43} required /></label><button disabled={state.busy}>{copy.unlock}</button></form>:<>
      <h2>{state.data.enabled?copy.on:copy.off}</h2>{!state.data.enabled&&<p>{copy.removed}</p>}
      {state.data.expiresAt&&<p>{copy.expiry}: <time dateTime={state.data.expiresAt}>{new Date(state.data.expiresAt).toLocaleDateString(language==="en"?"en-IN":language==="bn"?"bn-IN":"hi-IN")}</time></p>}
      <form key={`${state.data.groupId}:${state.data.version}`} onSubmit={save}><fieldset disabled={state.busy}><legend>{copy.strips}</legend>{state.data.members.map(member=><label key={member.token}><input type="checkbox" name="token" value={member.token} defaultChecked={member.selected} />{copy.strip} {state.data!.members.indexOf(member)+1}</label>)}</fieldset>
        <label><input type="checkbox" name="status" defaultChecked={state.data.enabled&&state.data.scopes.status}/>{copy.status}</label>
        <label><input type="checkbox" name="details" defaultChecked={state.data.enabled&&state.data.scopes.details}/>{copy.details}</label><p>{copy.detailsNotice}</p><button disabled={state.busy}>{copy.save}</button>
      </form><button disabled={state.busy} onClick={()=>void disable()}>{copy.disable}</button>
      {state.data.enabled&&<form onSubmit={invite}><label><input type="checkbox" name="details" disabled={!state.data.scopes.details||state.busy}/>{copy.inviteDetails}</label><button disabled={state.busy}>{copy.invite}</button></form>}
      {visibleInvitation&&<section aria-label={copy.code}><p>{copy.inviteNote}</p><output className="private-code">{visibleInvitation}</output><button onClick={()=>setInvitation("")}>{copy.cancel}</button></section>}
      {state.data.grants.map((grant,index)=><button key={grant.id} disabled={state.busy} onClick={()=>void execute("DELETE","/api/sharing/grants",{id:grant.id})}>{copy.revoke} {index+1}</button>)}
      <button disabled={state.busy} onClick={async()=>{setCode("");setInvitation("");await state.run(signal=>privateRequest("/api/sharing/session",signal,"DELETE"));state.clear();}}>{copy.logout}</button>
    </>}<button disabled={state.busy} onClick={()=>{setCode("");setInvitation("");void state.refresh();}}>{copy.refresh}</button><p><Link href="/find">MEDOT Find</Link></p>
  </main>;
}
