"use client";
import Link from "next/link";
import { useEffect,useRef,useState } from "react";
import MedotLogo from "../brand/medot-logo";
import Icon from "../marketing/icon";
import { privateRequest,usePrivateResource } from "../caregiver/private-client";
import { languages,languageNames,type Language } from "@/lib/i18n";
import { reminderCopy } from "@/lib/reminders/copy";
import type { ReminderState } from "@/lib/reminders/domain";

type State=ReminderState&{publicKey:string|null};
export function applicationKey(value:string):Uint8Array<ArrayBuffer>{
  const decoded=atob(value.replace(/-/g,"+").replace(/_/g,"/"));
  return Uint8Array.from(decoded,char=>char.charCodeAt(0));
}
function chosenToken(value:string){
  const entered=value.trim();if(/^[A-Za-z0-9_-]{22}$/.test(entered))return entered;
  try {const url=new URL(entered);if(url.origin===window.location.origin&&!url.search&&!url.hash)return /^\/m\/([A-Za-z0-9_-]{22})$/.exec(url.pathname)?.[1]??null;}catch{}
  return null;
}
export default function Reminders({initialLanguage="en",initialToken=""}:{initialLanguage?:Language;initialToken?:string}){
  const [language,setLanguage]=useState(initialLanguage),[consent,setConsent]=useState(false),[supported,setSupported]=useState<boolean|null>(null),[permissionBusy,setPermissionBusy]=useState(false),[notice,setNotice]=useState<"denied"|"error"|null>(null),[record,setRecord]=useState(initialToken);
  const state=usePrivateResource<State>("/api/reminders"),copy=reminderCopy[language],busy=state.busy||permissionBusy;
  const enableGeneration=useRef(0);
  useEffect(()=>{
    const hidden=()=>{if(document.visibilityState==="hidden"){enableGeneration.current++;setPermissionBusy(false);}};
    const generation=enableGeneration;document.addEventListener("visibilitychange",hidden);
    return()=>{generation.current++;document.removeEventListener("visibilitychange",hidden);};
  },[]);
  useEffect(()=>{
    const timer=setTimeout(()=>setSupported(window.isSecureContext&&"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window),0);
    return()=>clearTimeout(timer);
  },[]);
  useEffect(()=>{const previous=document.documentElement.lang;document.documentElement.lang=language;return()=>{document.documentElement.lang=previous;};},[language]);
  const mutate=async(url:string,method:string,body?:unknown)=>{
    setNotice(null);const ok=await state.run(signal=>privateRequest(url,signal,method,body));
    if(ok)await state.refresh();return ok;
  };
  const enable=async()=>{
    if(!consent||!state.data?.publicKey||!supported)return;
    const publicKey=state.data.publicKey,hasDevice=!!state.data.expiresAt,current=++enableGeneration.current;
    const cancelled=()=>enableGeneration.current!==current;
    setPermissionBusy(true);setNotice(null);
    const deadline=setTimeout(()=>{if(!cancelled()){enableGeneration.current++;setPermissionBusy(false);setNotice("error");}},15000);
    try {
      const permission=await Notification.requestPermission();if(cancelled())return;if(permission!=="granted"){setNotice("denied");return;}
      const registration=await navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"});
      if(cancelled())return;await navigator.serviceWorker.ready;if(cancelled())return;
      let existing=await registration.pushManager.getSubscription();
      if(cancelled())return;
      // Lost/expired capability or rotated VAPID keys require a fresh browser
      // subscription. Never reuse an endpoint bound to an inaccessible device.
      const currentKey=applicationKey(publicKey),oldKey=existing?.options.applicationServerKey;
      const sameKey=oldKey&&new Uint8Array(oldKey).length===currentKey.length&&new Uint8Array(oldKey).every((byte,index)=>byte===currentKey[index]);
      if(existing&&(!hasDevice||!sameKey)){await existing.unsubscribe();existing=null;}
      if(cancelled())return;
      const subscription=existing??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:applicationKey(publicKey)});
      if(cancelled()){if(!existing)await subscription.unsubscribe();return;}
      await mutate("/api/reminders/subscription","POST",{subscription:subscription.toJSON(),consent:true});
    } catch {if(!cancelled())setNotice("error");}finally{clearTimeout(deadline);if(!cancelled())setPermissionBusy(false);}
  };
  const removeAll=async()=>{
    if(await mutate("/api/reminders/subscription","DELETE")){
      try {const registration=await navigator.serviceWorker.getRegistration();await (await registration?.pushManager.getSubscription())?.unsubscribe();}catch{}
      setConsent(false);setRecord("");
    }
  };
  const save=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();const form=new FormData(event.currentTarget),token=chosenToken(record);
    if(!token){setNotice("error");return;}
    if(await mutate("/api/reminders","POST",{token,time:form.get("time"),language,enabled:true}))setRecord("");
  };
  return <main className="patient-page sharing-page reminder-page" lang={language}>
    <Link className="page-brand" href="/" aria-label={copy.home}><MedotLogo/></Link>
    <label htmlFor="reminder-language">{copy.language}</label><select id="reminder-language" value={language} onChange={event=>{setLanguage(event.target.value as Language);setNotice(null);}}>{languages.map(code=><option key={code} lang={code} value={code}>{languageNames[code]}</option>)}</select>
    <p className="eyebrow">MEDOT</p><h1>{copy.title}</h1><p className="page-intro">{copy.intro}</p>
    <section className="reminder-intro"><Icon name="bell"/><p>{copy.privacy}</p></section>
    <p role="status">{state.data?.enabled?copy.enabled:copy.paused}</p>
    {(state.error||notice)&&<p role="alert" className="warning">{notice==="denied"?copy.denied:copy.error}</p>}
    {supported===false&&<p>{copy.unsupported}</p>}
    {state.data&&!state.data.configured&&<p>{copy.unconfigured}</p>}
    {state.data?.expiresAt&&<p className="small-note">{copy.until}: <time dateTime={state.data.expiresAt}>{new Date(state.data.expiresAt).toLocaleDateString(language==="en"?"en-IN":language==="bn"?"bn-IN":"hi-IN",{timeZone:"Asia/Kolkata"})}</time></p>}
    {!state.data?.enabled&&<section className="reminder-consent"><label><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/>{copy.consent}</label><button disabled={busy||!consent||!supported||!state.data?.configured} onClick={()=>void enable()}><Icon name="bell"/>{copy.enable}</button><p className="small-note">{copy.install}</p></section>}
    {state.data?.enabled&&<form onSubmit={save}><h2>{copy.review}</h2><label htmlFor="reminder-record">{copy.record}</label><input id="reminder-record" value={record} onChange={event=>setRecord(event.target.value)} autoComplete="off" spellCheck={false} maxLength={2048} required/>
      <label htmlFor="reminder-time">{copy.time}</label><input id="reminder-time" name="time" type="time" required/><p className="small-note">{copy.limit}</p><button disabled={busy}>{copy.save}</button></form>}
    <section><h2>{copy.saved}</h2>{!state.data?.reminders.length&&<p>{copy.empty}</p>}
      {state.data?.reminders.map((reminder,index)=><article className="reminder-card" key={reminder.id}><div><span className="eyebrow">{copy.reminder} {index+1}</span><h3><time>{reminder.time}</time><span className="small-note">Asia/Kolkata</span></h3></div>
        {reminder.available?<Link className="button-link secondary-button" href={`/m/${reminder.token}?lang=${language}`}>{copy.open}<Icon name="arrow"/></Link>:<p className="warning">{copy.unavailable}</p>}
        <button className="secondary-button" disabled={busy} onClick={()=>void mutate("/api/reminders","DELETE",{id:reminder.id})}>{copy.delete}</button></article>)}
    </section>
    <div className="reminder-actions">{state.data?.enabled&&<button className="secondary-button" disabled={busy} onClick={()=>void mutate("/api/reminders/subscription","PATCH")}>{copy.pause}</button>}
      {(state.data?.expiresAt||state.error)&&<button className="secondary-button" disabled={busy} onClick={()=>void removeAll()}>{copy.removeAll}</button>}<button className="secondary-button" disabled={busy} onClick={()=>void state.refresh()}>{copy.refresh}</button></div>
    <details className="reminder-help"><summary>{copy.delivery}</summary><p>{copy.setup}</p><p>{copy.install}</p></details>
  </main>;
}
