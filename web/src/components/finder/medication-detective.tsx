"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import { dictionaries,languageNames,languages,type Language } from "@/lib/i18n";
import { usageSlots,type UsageSlot } from "@/lib/usage-slots";
import type { PublicRecord } from "@/lib/tag-repository";
import { collectCandidate,summarizeCandidates,type DetectiveSummary } from "@/lib/finder/detective";
import { readCandidate } from "@/lib/finder/candidate";
import { matchCandidate } from "@/lib/finder/match";
import { expiryState } from "@/lib/expiry";
import { formatExpiryMonth } from "@/lib/speech-text";
import { parseFindSelection } from "@/lib/voice/commands";
import { recognitionAvailable,startRecognition } from "@/lib/voice/recognition";
import { interactionPrompts } from "@/data/interaction-prompts";
import ReadAloud,{type ReadAloudHandle} from "@/app/m/[token]/read-aloud";
import MedotLogo from "../brand/medot-logo";
import CandidateReader from "./candidate-reader";

type Entry={token:string;record:PublicRecord|null};
import ShareIdentification from "../patient/share-identification";
type Summary=Omit<DetectiveSummary,"kind">&{kind:DetectiveSummary["kind"]|"INCOMPLETE"};
export default function MedicationDetective({initialLanguage="en"}:{initialLanguage?:Language}){
  const [language,setLanguage]=useState(initialLanguage),[selection,setSelection]=useState<UsageSlot|null>(null),[confirmed,setConfirmed]=useState<UsageSlot|null>(null);
  const [entries,setEntries]=useState<Entry[]>([]),[summary,setSummary]=useState<Summary|null>(null),[finished,setFinished]=useState(false);
  const [checking,setChecking]=useState(false),[finishing,setFinishing]=useState(false),[message,setMessage]=useState("");
  const [locating,setLocating]=useState<string|null>(null),[located,setLocated]=useState<boolean|null>(null);
  const [readingRecord,setReadingRecord]=useState<PublicRecord|null>(null),[voiceMode,setVoiceMode]=useState<"online"|"device">("online"),[guided,setGuided]=useState(false);
  const [speechRequest,setSpeechRequest]=useState(0),[resultEpoch,setResultEpoch]=useState(0),[session,setSession]=useState(0),[listening,setListening]=useState(false);
  const entryRef=useRef<Entry[]>([]),generation=useRef(0),controller=useRef<AbortController|null>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const voiceGeneration=useRef(0),stopRecognition=useRef<(()=>void)|null>(null),speechControl=useRef<ReadAloudHandle|null>(null),resultTitle=useRef<HTMLHeadingElement>(null);
  const copy=dictionaries[language],slotLabels=[copy.slotMorning,copy.slotAfternoon,copy.slotEvening,copy.slotNight,copy.slotAsNeeded];
  const putEntries=useCallback((value:Entry[])=>{entryRef.current=value;setEntries(value);},[]);
  const cancel=useCallback(()=>{generation.current++;controller.current?.abort();controller.current=null;clearTimeout(timer.current);},[]);
  const cancelVoice=useCallback(()=>{voiceGeneration.current++;stopRecognition.current?.();stopRecognition.current=null;},[]);
  const begin=useCallback(()=>{cancel();setReadingRecord(null);setSpeechRequest(0);setSummary(null);setLocated(null);setChecking(false);setMessage("");},[cancel]);
  const reset=useCallback(()=>{
    begin();cancelVoice();putEntries([]);setSelection(null);setConfirmed(null);setFinished(false);setFinishing(false);setLocating(null);setListening(false);
    setVoiceMode("online");setGuided(false);setResultEpoch(0);setSession(value=>value+1);
  },[begin,cancelVoice,putEntries]);
  useEffect(()=>{const previous=document.documentElement.lang;document.documentElement.lang=language;return()=>{document.documentElement.lang=previous;};},[language]);
  useEffect(()=>{
    const hide=()=>reset(),visibility=()=>{if(document.visibilityState==="hidden")hide();};
    window.addEventListener("pagehide",hide);document.addEventListener("visibilitychange",visibility);
    return()=>{cancel();cancelVoice();window.removeEventListener("pagehide",hide);document.removeEventListener("visibilitychange",visibility);};
  },[reset,cancel,cancelVoice]);
  useEffect(()=>{if(speechRequest>0)speechControl.current?.read();},[speechRequest]);
  useEffect(()=>{if(resultEpoch>0)resultTitle.current?.focus();},[resultEpoch]);

  function replaceRecord(record:PublicRecord){
    if(!entryRef.current.some(entry=>entry.token===record.token))return;
    const records=collectCandidate(entryRef.current.flatMap(entry=>entry.record?[entry.record]:[]),record);
    const byToken=new Map(records.map(item=>[item.token,item]));
    putEntries(entryRef.current.map(entry=>({token:entry.token,record:byToken.get(entry.token)??null})));
  }
  function invalidateToken(token:string){
    putEntries(entryRef.current.map(entry=>entry.token===token?{token,record:null}:entry));setReadingRecord(null);setLocated(null);
    if(finished){const records=entryRef.current.flatMap(entry=>entry.record?[entry.record]:[]);setSummary({...summarizeCandidates(records,confirmed!),kind:"INCOMPLETE"});setResultEpoch(value=>value+1);}
  }
  function refreshReading(record:PublicRecord){
    const previous=entryRef.current.find(entry=>entry.token===record.token)?.record;
    const signature=(value:PublicRecord|null|undefined)=>value?JSON.stringify([value.medicineId,value.genericName,value.brandName,value.strength,value.dosageForm,value.expiryMonth,value.usageSlots]):null;
    const expiryChanged=summary?.matches.some(item=>item.token===record.token)&&summary.expiredTokens.includes(record.token)!==(expiryState(record.expiryMonth)==="EXPIRED");
    replaceRecord(record);setReadingRecord(record);
    if(summary&&(signature(previous)!==signature(record)||expiryChanged)){setSummary(null);setMessage(copy.detectiveRecheck);}
  }
  async function candidate(token:string){
    if(!confirmed||finishing)return;
    begin();const exists=entryRef.current.some(entry=>entry.token===token);
    if(!locating&&!exists&&entryRef.current.length>=5){setMessage(copy.detectiveLimit);return;}
    if(!locating&&!exists)putEntries([...entryRef.current,{token,record:null}]);
    else if(exists)putEntries(entryRef.current.map(entry=>entry.token===token?{token,record:null}:entry));
    const current=generation.current,request=new AbortController();controller.current=request;setChecking(true);
    timer.current=setTimeout(()=>{if(current===generation.current){cancel();setChecking(false);setMessage(copy.candidateUnavailable);}},10000);
    try{
      const record=await readCandidate(token,request.signal);if(current!==generation.current)return;
      clearTimeout(timer.current);setChecking(false);replaceRecord(record);setReadingRecord(record);
      if(locating){setLocated(token===locating);setResultEpoch(value=>value+1);}else if(exists)setMessage(interactionPrompts[language].duplicate);
      if(guided)setSpeechRequest(value=>value+1);
    }catch{if(current===generation.current){clearTimeout(timer.current);setChecking(false);setMessage(copy.candidateUnavailable);}}
  }
  async function finish(){
    if(!confirmed||!entryRef.current.length||finishing)return;
    begin();cancelVoice();setListening(false);setFinished(true);setFinishing(true);setLocating(null);setSession(value=>value+1);
    const tokens=entryRef.current.map(entry=>entry.token),current=generation.current,request=new AbortController();controller.current=request;
    putEntries(tokens.map(token=>({token,record:null})));
    timer.current=setTimeout(()=>{
      if(current!==generation.current)return;cancel();setFinishing(false);setSummary({kind:"INCOMPLETE",matches:[],expiredTokens:[],unclassifiedTokens:[]});setResultEpoch(value=>value+1);
    },10000);
    const fresh=await Promise.all(tokens.map(async token=>{try{return {token,record:await readCandidate(token,request.signal)};}catch{return {token,record:null};}}));
    if(current!==generation.current)return;
    clearTimeout(timer.current);putEntries(fresh);setFinishing(false);
    const records=fresh.flatMap(entry=>entry.record?[entry.record]:[]),result=summarizeCandidates(records,confirmed);
    setSummary(fresh.some(entry=>!entry.record)?{...result,kind:"INCOMPLETE"}:result);setResultEpoch(value=>value+1);
  }
  function listen(){
    if(listening)return;if(!recognitionAvailable()){setMessage(copy.recognitionUnavailable);return;}
    const current=++voiceGeneration.current;setListening(true);setMessage(copy.listening);
    stopRecognition.current=startRecognition(language,text=>{
      if(current!==voiceGeneration.current)return;const proposal=parseFindSelection(text,language,[]);
      if(proposal.kind==="target"&&proposal.target.kind==="slot"){setSelection(proposal.target.slot);setMessage(copy.confirmTarget);}else setMessage(copy.selectionUnknown);
    },()=>{if(current===voiceGeneration.current)setListening(false);},()=>{if(current===voiceGeneration.current)setMessage(copy.recognitionFailed);});
  }
  function read(record:PublicRecord){setReadingRecord(null);setGuided(false);setReadingRecord(record);setSpeechRequest(value=>value+1);}
  const summaryText=summary?({NONE:copy.detectiveNone,ONE:copy.detectiveOne,MULTIPLE:copy.detectiveMultiple,INCOMPLETE:copy.detectiveIncomplete}[summary.kind]):"";
  return <main className="patient-page finder-page detective-page" lang={language} data-detective-state={finishing?"finishing":summary?summary.kind:locating?"locating":confirmed?"collecting":"choosing"}>
    <MedotLogo/><label htmlFor="detective-language">{copy.language}</label><select id="detective-language" value={language} onChange={event=>{reset();setLanguage(event.target.value as Language);}}>{languages.map(lang=><option key={lang} value={lang}>{languageNames[lang]}</option>)}</select>
    <h1>{copy.medicationDetective}</h1><p>{copy.detectiveIntro}</p><p className="small-note">{copy.finderPrivacy}</p>
    {!confirmed&&<section aria-label={copy.chooseTarget}>
      <label htmlFor="detective-timing">{copy.detectiveTiming}</label><select id="detective-timing" value={selection??""} onChange={event=>{cancelVoice();setListening(false);setMessage("");setSelection(usageSlots.includes(event.target.value as UsageSlot)?event.target.value as UsageSlot:null);}}><option value="">{copy.detectiveSelectTiming}</option>{usageSlots.map((slot,index)=><option key={slot} value={slot}>{slotLabels[index]}</option>)}</select>
      <button type="button" disabled={!selection} onClick={()=>{cancelVoice();setListening(false);setMessage("");setConfirmed(selection);setSession(value=>value+1);}}>{copy.confirmTarget}</button>
      <p className="small-note">{copy.detectiveSayTiming}</p><p className="small-note">{copy.microphoneExplanation}</p><button type="button" disabled={listening} onClick={listen}>{copy.listenTarget}</button>
    </section>}
    {confirmed&&<>
      <section className="finder-target"><h2>{copy.confirmedTarget}</h2><p>{slotLabels[usageSlots.indexOf(confirmed)]}</p><button type="button" onClick={reset}>{copy.changeTarget}</button>
        <p>{copy.detectiveCount}: {entries.length} / 5</p><p>{copy.detectiveScope}</p>
        <label htmlFor="detective-voice">{copy.voiceChoice}</label><select id="detective-voice" disabled={Boolean(readingRecord)||checking||finishing} value={voiceMode} onChange={event=>setVoiceMode(event.target.value as "online"|"device")}><option value="online">{copy.onlineVoice}</option><option value="device">{copy.deviceVoice}</option></select>
        <button type="button" aria-pressed={guided} onClick={()=>{setGuided(true);if(readingRecord)setSpeechRequest(value=>value+1);}}>{copy.voiceGuidance}</button>
      </section>
      {(!finished||locating)&&!finishing&&<CandidateReader key={session} language={language} enabled onBegin={begin} onCandidate={token=>void candidate(token)} onFailure={()=>{begin();setMessage(copy.candidateUnavailable);}}/>}
      {locating&&<p>{copy.confirmedTarget}: {copy.detectiveStrip} {entries.findIndex(entry=>entry.token===locating)+1}. {copy.detectiveLocate}</p>}
      <button type="button" disabled={!entries.length||checking||finishing} onClick={()=>void finish()}>{copy.detectiveFinish}</button>
      {finished&&!finishing&&<button type="button" onClick={()=>{begin();setFinished(false);setLocating(null);setSession(value=>value+1);}}>{copy.detectiveContinue}</button>}
    </>}
    <button type="button" onClick={reset}>{copy.detectiveStop}</button>
    {message&&<p role="status">{message}</p>}{checking&&<p role="status">{copy.candidateChecking}</p>}{finishing&&<p role="status">{copy.detectiveFinishing}</p>}
    {summary&&<section className="finder-verdict" aria-labelledby="detective-result-title">
      {summary.expiredTokens.length>0&&<p className="warning" role="alert">{copy.expiryWarning}</p>}
      <h2 id="detective-result-title" ref={resultTitle} tabIndex={-1}>{summaryText}</h2>
      {summary.kind==="INCOMPLETE"&&<p>{copy.detectiveIncompleteDetail}</p>}
      {summary.kind==="MULTIPLE"&&<p>{interactionPrompts[language]["multiple-results"]}</p>}
      {summary.unclassifiedTokens.length>0&&<p>{copy.detectiveUnclassified}</p>}
      <p>{interactionPrompts[language]["scan-finished"]}</p>
    </section>}
    {entries.length>0&&<section aria-labelledby="detective-strips-title" className="detective-collection"><h2 id="detective-strips-title">{copy.detectiveScanned}</h2>
      {entries.map((entry,index)=><article key={entry.token} className="detective-strip">
        {entry.record&&expiryState(entry.record.expiryMonth)==="EXPIRED"&&<p className="warning" role="alert">{copy.expiryWarning}</p>}
        <p>{copy.detectiveStrip} {index+1}</p>{entry.record?<>
          <h3>{entry.record.genericName}</h3>{entry.record.brandName&&<p>{entry.record.brandName}</p>}<p>{entry.record.strength} · {entry.record.dosageForm}</p>
          <p>{copy.recordedTiming}: {entry.record.usageSlots?.length?entry.record.usageSlots.map(slot=>slotLabels[usageSlots.indexOf(slot)]).join(", "):copy.timingUnknown}</p>
          <p>{copy.labelledExpiry}: {formatExpiryMonth(entry.record.expiryMonth,language)}</p>
          {summary&&<p className="detective-classification">{entry.record.usageSlots?.length?(entry.record.usageSlots.includes(confirmed!)?copy.candidateMatch:copy.candidateWrong):copy.candidateUnknownTiming}</p>}
          <button type="button" disabled={finishing||checking} onClick={()=>read(entry.record!)}>{copy.detectiveRead}</button>
          {summary?.matches.some(record=>record.token===entry.token)&&<button type="button" onClick={()=>{begin();setLocating(entry.token);setSession(value=>value+1);}}>{copy.detectiveRetap}</button>}
        </>:<p>{finishing?copy.checkRecord:copy.candidateUnavailable}</p>}
      </article>)}
    </section>}
    {readingRecord&&<section className="finder-verdict" aria-labelledby="detective-current-title">
      {expiryState(readingRecord.expiryMonth)==="EXPIRED"&&<p className="warning" role="alert">{copy.expiryWarning}</p>}
      <h2 id="detective-current-title" ref={located!==null?resultTitle:undefined} tabIndex={-1}>{located===null?copy.detectiveCurrent:located?copy.detectiveLocateMatch:copy.detectiveLocateWrong}</h2>
      <h3>{readingRecord.genericName}</h3><p>{readingRecord.strength} · {readingRecord.dosageForm}</p>
      {!checking&&!finishing&&<ShareIdentification key={`sharing:${readingRecord.token}:${language}`} token={readingRecord.token} language={language}/>}
      <ReadAloud key={`${readingRecord.token}:${language}`} ref={speechControl} token={readingRecord.token} language={language} initialVoice={voiceMode} onVoiceChoice={setVoiceMode} onRecord={refreshReading} onInvalid={()=>invalidateToken(readingRecord.token)} feedback={record=>{
        const verdict=locating?(record.token===locating?(expiryState(record.expiryMonth)==="EXPIRED"?"MATCH_EXPIRED":"MATCH"):"NO_MATCH"):matchCandidate({kind:"slot",slot:confirmed!},record);
        return verdict==="MATCH"?"match":verdict==="MATCH_EXPIRED"?"expired-match":verdict==="NO_MATCH"?"mismatch":null;
      }}/>
    </section>}
  </main>;
}
