"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { dictionaries, type Language } from "@/lib/i18n";
import { decodeCandidateMessage, parseCandidateUrl, type CandidateMessage } from "@/lib/finder/candidate";
type NfcReader = { scan(options:{signal:AbortSignal}):Promise<void>; onreading:((event:{message:CandidateMessage})=>void)|null; onreadingerror:(()=>void)|null };
type Props = { language:Language; enabled:boolean; onCandidate(token:string):void; onFailure():void; onBegin?():void };
export default function CandidateReader({language,enabled,onCandidate,onFailure,onBegin}:Props) {
  const copy=dictionaries[language], [value,setValue]=useState(""),[state,setState]=useState<"idle"|"starting"|"scanning"|"failed"|"invalid">("idle");
  const [scanActive,setScanActive]=useState(false);
  const reader=useRef<NfcReader|null>(null),controller=useRef<AbortController|null>(null),generation=useRef(0);
  const cancel=useCallback(()=>{generation.current++;controller.current?.abort();controller.current=null;if(reader.current){reader.current.onreading=null;reader.current.onreadingerror=null;reader.current=null;}},[]);
  useEffect(()=>{
    const hide=()=>{cancel();setState("idle");setScanActive(false);setValue("");},visibility=()=>{if(document.visibilityState==="hidden")hide();};
    hide();
    document.addEventListener("visibilitychange",visibility);window.addEventListener("pagehide",hide);
    return()=>{cancel();document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pagehide",hide);};
  },[language,enabled,cancel]);
  async function scan(){
    if(!enabled)return;cancel();onBegin?.();
    const Constructor=(window as Window & {NDEFReader?:new()=>NfcReader}).NDEFReader;
    if(!Constructor||window.isSecureContext===false||window.top!==window){setState("failed");onFailure();return;}
    const current=generation.current,request=new AbortController();controller.current=request;setState("starting");setScanActive(true);
    try{
      const device=new Constructor();reader.current=device;
      device.onreading=event=>{if(current!==generation.current||request.signal.aborted)return;const token=decodeCandidateMessage(event.message,window.location.origin);if(token){setValue("");onCandidate(token);}else{setState("invalid");onFailure();}};
      device.onreadingerror=()=>{if(current===generation.current&&!request.signal.aborted){setState("invalid");onFailure();}};
      await device.scan({signal:request.signal});
      if(current===generation.current)setState("scanning");
    }catch{if(current===generation.current){cancel();setState("failed");setScanActive(false);onFailure();}}
  }
  const message=state==="starting"?copy.nfcStarting:state==="scanning"?copy.nfcScanning:state==="failed"?copy.nfcFailed:state==="invalid"?copy.candidateInvalid:"";
  return <section className="candidate-reader" aria-label={copy.nfcStart}>
    <p className="small-note">{copy.nfcUnavailable}</p>
    <button type="button" disabled={!enabled||scanActive} onClick={()=>void scan()}>{copy.nfcStart}</button>
    {scanActive&&<button type="button" onClick={()=>{cancel();setState("idle");setScanActive(false);onBegin?.();}}>{copy.nfcStop}</button>}
    {message&&<p role="status">{message}</p>}
    <form onSubmit={event=>{event.preventDefault();if(!enabled)return;cancel();setScanActive(false);onBegin?.();const token=parseCandidateUrl(value,window.location.origin);setValue("");if(token){setState("idle");onCandidate(token);}else{setState("invalid");onFailure();}}}>
      <label htmlFor="candidate-url">{copy.candidateUrl}</label>
      <input id="candidate-url" inputMode="url" type="text" maxLength={256} required autoComplete="off" spellCheck={false} value={value} disabled={!enabled} aria-describedby="candidate-url-help" onChange={event=>setValue(event.target.value)}/>
      <p id="candidate-url-help" className="small-note">{copy.candidateUrlHelp}</p>
      <button type="submit" disabled={!enabled}>{copy.candidateCheck}</button>
    </form>
  </section>;
}
