"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import { dictionaries,languageNames,languages,type Language } from "@/lib/i18n";
import { usageSlots } from "@/lib/usage-slots";
import { findOptionsSchema,formatFindOption,type FindOption,type FindTarget,type MatchVerdict } from "@/lib/finder/types";
import { readCandidate } from "@/lib/finder/candidate";
import { matchCandidate } from "@/lib/finder/match";
import { expiryState } from "@/lib/expiry";
import { formatExpiryMonth } from "@/lib/speech-text";
import { parseFindSelection } from "@/lib/voice/commands";
import { recognitionAvailable,startRecognition } from "@/lib/voice/recognition";
import type { PublicRecord } from "@/lib/tag-repository";
import { interactionPrompts } from "@/data/interaction-prompts";
import MedotLogo from "../brand/medot-logo";
import ReadAloud, { type ReadAloudHandle } from "@/app/m/[token]/read-aloud";
import CandidateReader from "./candidate-reader";
import OwnerChoices from "./owner-choices";
import ShareIdentification from "../patient/share-identification";
type Result={record:PublicRecord;verdict:MatchVerdict};
export default function FindMedicine({initialTargets=[],initialLanguage="en"}:{initialTargets?:FindOption[];initialLanguage?:Language}){
  const [language,setLanguage]=useState(initialLanguage),[demoTargets,setDemoTargets]=useState(initialTargets),[references,setReferences]=useState<FindOption[]>([]);
  const [ownerTargets,setOwnerTargets]=useState<FindOption[]>([]);
  const [selection,setSelection]=useState<FindTarget|null>(null),[confirmed,setConfirmed]=useState<FindTarget|null>(null),[reference,setReference]=useState(false);
  const [result,setResult]=useState<Result|null>(null),[checking,setChecking]=useState(false),[cannotIdentify,setCannotIdentify]=useState(false),[message,setMessage]=useState("");
  const [session,setSession]=useState(0),[listening,setListening]=useState(false);
  const [guided,setGuided]=useState(false),[announcement,setAnnouncement]=useState(0),[voiceMode,setVoiceMode]=useState<"online"|"device">("device");
  const speechControl=useRef<ReadAloudHandle|null>(null);
  const request=useRef<AbortController|null>(null),generation=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const stopRecognition=useRef<(()=>void)|null>(null),voiceGeneration=useRef(0),resultTitle=useRef<HTMLHeadingElement>(null);
  const copy=dictionaries[language],slotLabels=[copy.slotMorning,copy.slotAfternoon,copy.slotEvening,copy.slotNight,copy.slotAsNeeded];
  const options=[...new Map([...demoTargets,...references,...ownerTargets].map(option=>[option.medicineId,option])).values()];
  const cancelRequests=useCallback(()=>{generation.current++;request.current?.abort();request.current=null;clearTimeout(timer.current);},[]);
  const cancelRecognition=useCallback(()=>{voiceGeneration.current++;stopRecognition.current?.();stopRecognition.current=null;},[]);
  const clearResult=useCallback(()=>{cancelRequests();setResult(null);setChecking(false);setCannotIdentify(false);},[cancelRequests]);
  const reset=useCallback((keepReferences=false)=>{
    clearResult();cancelRecognition();setListening(false);
    setSelection(null);setConfirmed(null);setReference(false);setMessage("");if(!keepReferences)setReferences([]);setSession(value=>value+1);
    setGuided(false);setAnnouncement(0);setVoiceMode("device");
  },[clearResult,cancelRecognition]);
  useEffect(()=>{
    const controller=new AbortController();
    void fetch("/api/public/find-targets",{cache:"no-store",signal:controller.signal}).then(response=>response.ok?response.json():null).then(body=>{if(controller.signal.aborted)return;const parsed=findOptionsSchema.safeParse(body?.targets);setDemoTargets(parsed.success?parsed.data:[]);}).catch(()=>{if(!controller.signal.aborted)setDemoTargets([]);});
    return()=>controller.abort();
  },[]);
  useEffect(()=>{const previous=document.documentElement.lang;document.documentElement.lang=language;return()=>{document.documentElement.lang=previous;};},[language]);
  useEffect(()=>{
    const hide=()=>reset(),visibility=()=>{if(document.visibilityState==="hidden")hide();};
    document.addEventListener("visibilitychange",visibility);window.addEventListener("pagehide",hide);
    return()=>{cancelRequests();cancelRecognition();document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pagehide",hide);};
  },[reset,cancelRequests,cancelRecognition]);
  useEffect(()=>{if(announcement>0||cannotIdentify)resultTitle.current?.focus();},[announcement,cannotIdentify]);
  useEffect(()=>{if(guided&&announcement>0)speechControl.current?.read();},[guided,announcement]);
  function targetLabel(target:FindTarget){return target.kind==="slot"?slotLabels[usageSlots.indexOf(target.slot)]:formatFindOption(options.find(option=>option.medicineId===target.medicineId)??{medicineId:target.medicineId,genericName:copy.medicine,strength:"",dosageForm:""});}
  function fail(){clearResult();setCannotIdentify(true);}
  async function candidate(token:string){
    if(!confirmed&&!reference)return;
    clearResult();setMessage("");const current=generation.current,controller=new AbortController();request.current=controller;setChecking(true);
    timer.current=setTimeout(()=>{if(current===generation.current){generation.current++;controller.abort();setChecking(false);setCannotIdentify(true);}},10000);
    try{
      const record=await readCandidate(token,controller.signal);if(current!==generation.current)return;
      clearTimeout(timer.current);setChecking(false);
      if(reference){
        if(!record.medicineId){setMessage(copy.referenceMissingIdentity);return;}
        const option:FindOption={medicineId:record.medicineId,genericName:record.genericName,strength:record.strength,dosageForm:record.dosageForm,...(record.brandName?{brandName:record.brandName}:{})};
        if(references.length>=5&&!references.some(item=>item.medicineId===option.medicineId)){setMessage(copy.referenceLimit);return;}
        setReferences(previous=>[...previous.filter(item=>item.medicineId!==option.medicineId),option]);setReference(false);setSession(value=>value+1);setMessage(copy.referenceReady);return;
      }
      if(confirmed){setResult({record,verdict:matchCandidate(confirmed,record)});setAnnouncement(value=>value+1);}
    }catch{if(current===generation.current){clearTimeout(timer.current);setChecking(false);setResult(null);setCannotIdentify(true);}}
  }
  function listen(){
    if(listening)return;if(!recognitionAvailable()){setMessage(copy.recognitionUnavailable);return;}
    const current=++voiceGeneration.current;setListening(true);setMessage(copy.listening);
    stopRecognition.current=startRecognition(language,text=>{
      if(current!==voiceGeneration.current)return;const proposal=parseFindSelection(text,language,options);
      if(proposal.kind==="target"){setSelection(proposal.target);setMessage(copy.confirmTarget);}else setMessage(proposal.kind==="ambiguous"?copy.selectionAmbiguous:copy.selectionUnknown);
    },()=>{if(current===voiceGeneration.current)setListening(false);},()=>{if(current===voiceGeneration.current)setMessage(copy.recognitionFailed);});
  }
  const selectedValue=selection?(selection.kind==="slot"?`slot:${selection.slot}`:`medicine:${selection.medicineId}`):"";
  const verdictText=result?({MATCH:copy.candidateMatch,MATCH_EXPIRED:copy.candidateExpired,NO_MATCH:copy.candidateWrong,TIMING_UNKNOWN:copy.candidateUnknownTiming}[result.verdict]):copy.candidateUnavailable;
  const cue=result?.verdict==="MATCH"?"match":result?.verdict==="MATCH_EXPIRED"?"expired-match":result?.verdict==="NO_MATCH"?"mismatch":null;
  return <main className="patient-page finder-page" lang={language} data-finder-state={checking?"resolving":result||cannotIdentify?"verdict":confirmed?"confirmed":reference?"scanning":"choosing"}>
    <MedotLogo/><label htmlFor="finder-language">{copy.language}</label><select id="finder-language" value={language} onChange={event=>{reset();setLanguage(event.target.value as Language);}}>{languages.map(lang=><option key={lang} value={lang}>{languageNames[lang]}</option>)}</select>
    <OwnerChoices key={`${language}:${session}`} language={language} onChoices={setOwnerTargets}/>
    <h1>{copy.findMedicine}</h1><p>{copy.finderIntro}</p><p className="small-note">{copy.finderPrivacy}</p>
    {!confirmed&&<section aria-label={copy.chooseTarget}>
      <label htmlFor="find-target">{copy.chooseTarget}</label><select id="find-target" value={selectedValue} onChange={event=>{
        voiceGeneration.current++;stopRecognition.current?.();setListening(false);setMessage("");
        const value=event.target.value;if(value.startsWith("slot:")&&usageSlots.some(slot=>`slot:${slot}`===value))setSelection({kind:"slot",slot:usageSlots.find(slot=>`slot:${slot}`===value)!});
        else{const option=options.find(option=>`medicine:${option.medicineId}`===value);setSelection(option?{kind:"medicine",medicineId:option.medicineId}:null);}
      }}><option value="">{copy.selectTarget}</option>{usageSlots.map((slot,index)=><option key={slot} value={`slot:${slot}`}>{slotLabels[index]}</option>)}{options.map(option=><option key={option.medicineId} value={`medicine:${option.medicineId}`}>{formatFindOption(option)}</option>)}</select>
      {selection&&<p>{targetLabel(selection)}</p>}
      <button type="button" disabled={!selection} onClick={()=>{clearResult();voiceGeneration.current++;stopRecognition.current?.();setListening(false);setConfirmed(selection);setReference(false);setMessage("");setSession(value=>value+1);}}>{copy.confirmTarget}</button>
      <p className="small-note">{copy.sayTarget}</p><p className="small-note">{copy.microphoneExplanation}</p><button type="button" disabled={listening||reference} onClick={listen}>{copy.listenTarget}</button>
      <button type="button" onClick={()=>{clearResult();voiceGeneration.current++;stopRecognition.current?.();setListening(false);setReference(true);setMessage("");setSession(value=>value+1);}}>{copy.scanReference}</button>
    </section>}
    {confirmed&&<section className="finder-target" aria-labelledby="confirmed-target-title"><h2 id="confirmed-target-title">{copy.confirmedTarget}</h2><p>{targetLabel(confirmed)}</p><button type="button" onClick={()=>reset(true)}>{copy.changeTarget}</button><p>{interactionPrompts[language]["move-closer"]}</p>
      <label htmlFor="finder-voice">{copy.voiceChoice}</label><select id="finder-voice" disabled={Boolean(result)||checking} value={voiceMode} onChange={event=>setVoiceMode(event.target.value as "online"|"device")}><option value="online">{copy.onlineVoice}</option><option value="device">{copy.deviceVoice}</option></select>
      <button type="button" aria-pressed={guided} onClick={()=>setGuided(true)}>{copy.voiceGuidance}</button>
    </section>}
    {(confirmed||reference)&&<CandidateReader key={session} language={language} enabled onCandidate={token=>void candidate(token)} onFailure={fail} onBegin={clearResult}/>}
    <button type="button" onClick={()=>reset()}>{copy.stopFinder}</button>
    {message&&<p role="status">{message}</p>}{checking&&<p role="status">{copy.candidateChecking}</p>}
    {(result||cannotIdentify)&&<section className={`finder-verdict ${result?.verdict==="MATCH"?"is-match":""}`} aria-labelledby="finder-result-title">
      {result&&expiryState(result.record.expiryMonth)==="EXPIRED"&&<p className="warning" role="alert">{copy.expiryWarning}</p>}
      <h2 id="finder-result-title" ref={resultTitle} tabIndex={-1}>{verdictText}</h2>
      {result?<>
        <h3>{result.record.genericName}</h3>{result.record.brandName&&<p>{result.record.brandName}</p>}<p className="strength">{result.record.strength} · {result.record.dosageForm}</p>
        {!checking&&<ShareIdentification key={`sharing:${result.record.token}:${language}`} token={result.record.token} language={language}/>}
        {cue&&<p>{interactionPrompts[language][cue]}</p>}
        <dl><div><dt>{copy.recordedTiming}</dt><dd>{result.record.usageSlots?.length?result.record.usageSlots.map(slot=>slotLabels[usageSlots.indexOf(slot)]).join(", "):copy.timingUnknown}</dd></div><div><dt>{copy.labelledExpiry}</dt><dd>{formatExpiryMonth(result.record.expiryMonth,language)}</dd></div></dl>
        <ReadAloud key={`${result.record.token}:${language}`} ref={speechControl} token={result.record.token} language={language} initialVoice={voiceMode} onVoiceChoice={setVoiceMode} feedback={record=>{
          if(!confirmed)return null;const verdict=matchCandidate(confirmed,record);return verdict==="MATCH"?"match":verdict==="MATCH_EXPIRED"?"expired-match":verdict==="NO_MATCH"?"mismatch":null;
        }} onInvalid={fail} onRecord={record=>{if(confirmed)setResult({record,verdict:matchCandidate(confirmed,record)});}}/>
      </>:<p>{copy.unknownDetail}</p>}
    </section>}
  </main>;
}
