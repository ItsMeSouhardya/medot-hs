"use client";
import { useCallback, useEffect, useEffectEvent, useImperativeHandle, useRef, useState, type Ref } from "react";
import { dictionaries, locales, type Language } from "@/lib/i18n";
import { buildSpeechScript } from "@/lib/speech/script";
import { MAX_AUDIO_BYTES, type SpeechKind, type SpeechScript } from "@/lib/speech/types";
import { readCurrentRecord, RecordLookupError, type RecordFailure } from "@/lib/public-record";
import type { PublicRecord } from "@/lib/tag-repository";
import type { VoiceCommand } from "@/lib/voice/commands";
import VoiceControls, { type VoiceControlsHandle } from "@/components/patient/voice-controls";
import { automaticVoiceCopy } from "@/lib/voice/copy";
import { interactionPrompts, type InteractionPrompt } from "@/data/interaction-prompts";

type VoiceMode = "online" | "device";
type Prepared = { audio: HTMLAudioElement; cue?: HTMLAudioElement; cueKey:InteractionPrompt|null; stage:"identity"|"cue"; script: SpeechScript; kind: SpeechKind; language: Language };
export type ReadAloudHandle={read():void;stop():void};
type Props = { ref?:Ref<ReadAloudHandle>; token: string; language?: Language; initialVoice?: VoiceMode; disabled?: boolean; autoRead?: boolean; autoCommands?: boolean; onAutoRead?(): void; onVoiceChoice?:(voice:VoiceMode)=>void; feedback?:(record:PublicRecord)=>InteractionPrompt|null; onRecord?: (record: PublicRecord) => void; onInvalid?: (kind: RecordFailure) => void };
export default function ReadAloud({ ref, token, language = "en", initialVoice = "device", disabled = false, autoRead = false, autoCommands = false, onAutoRead, onVoiceChoice,feedback,onRecord, onInvalid }: Props) {
  const copy = dictionaries[language];
  const [mode, setMode] = useState(initialVoice), [phase, setPhase] = useState<"idle" | "checking" | "playing" | "prepared">("idle");
  const [status, setStatus] = useState(""), [failed, setFailed] = useState(false);
  const [offerDevice, setOfferDevice] = useState(false), [offerEnglish, setOfferEnglish] = useState(false);
  const [transcript, setTranscript] = useState<SpeechScript | null>(null);
  const [cueUnavailable,setCueUnavailable]=useState(false);
  const [listenRequest, setListenRequest] = useState(0);
  const voiceControls = useRef<VoiceControlsHandle>(null), automaticAttempted = useRef(false);
  const generation = useRef(0), controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prepared = useRef<Prepared | null>(null), objectUrl = useRef<string | null>(null);
  // Keep the native utterance alive until completion; some engines otherwise
  // stop delivering its events during longer readings.
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechStartTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const readButton = useRef<HTMLButtonElement>(null), lastKind = useRef<SpeechKind>("full");
  const cancelWork = useCallback(() => {
    voiceControls.current?.stop();
    generation.current++; controller.current?.abort(); controller.current = null; clearTimeout(timer.current);
    clearTimeout(speechStartTimer.current);
    if (utteranceRef.current) { utteranceRef.current.onstart = null; utteranceRef.current.onend = null; utteranceRef.current.onerror = null; utteranceRef.current = null; }
    window.speechSynthesis?.cancel();
    if (prepared.current) { for(const audio of [prepared.current.audio,prepared.current.cue]) if(audio){audio.onended=null;audio.onerror=null;audio.pause();audio.src="";} prepared.current = null; }
    if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = null; }
  }, []);
  const automaticRead = useEffectEvent(() => {
    if (automaticAttempted.current || document.visibilityState === "hidden") return;
    void speak();
  });
  useEffect(() => {
    if (!autoRead || disabled) return;
    const scheduled = setTimeout(automaticRead, 0);
    return () => clearTimeout(scheduled);
  }, [autoRead, disabled, token, language]);
  useEffect(() => {
    const hide = () => { cancelWork(); setPhase("idle"); setTranscript(null); setStatus(copy.readingStopped); setOfferDevice(false); setOfferEnglish(false); };
    const visibility = () => { if (document.visibilityState === "hidden") hide(); };
    document.addEventListener("visibilitychange", visibility); window.addEventListener("pagehide", hide);
    return () => { document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", hide); cancelWork(); };
  }, [language, token, cancelWork, copy.readingStopped]);
  function claimAutomaticRead() { if (!automaticAttempted.current) { automaticAttempted.current = true; if (autoRead) onAutoRead?.(); } }
  function stop() { claimAutomaticRead(); cancelWork(); setPhase("idle"); setFailed(false); setTranscript(null); setOfferDevice(false); setOfferEnglish(false); setStatus(copy.readingStopped); setTimeout(() => readButton.current?.focus(), 0); }
  function readingFinished() { cancelWork(); setPhase("idle"); setStatus(copy.audioEnded); setListenRequest(previous => previous + 1); }
  function invalidate(error: unknown) {
    cancelWork(); setPhase("idle"); setTranscript(null); setOfferDevice(false); setOfferEnglish(false); setFailed(true); setStatus(copy.verificationFailed);
    onInvalid?.(error instanceof RecordLookupError ? error.kind : "unavailable");
  }
  function cueFor(record:PublicRecord,kind:SpeechKind){return kind==="full"?(feedback?.(record)??null):null;}
  function decorate(script:SpeechScript,record:PublicRecord,kind:SpeechKind):SpeechScript{
    const cue=cueFor(record,kind);return cue?{...script,text:`${script.text} ${interactionPrompts[script.language][cue]}`} : script;
  }
  async function playAudio(item:Prepared,current:number){
    const audio=item.stage==="cue"?item.cue:item.audio;if(!audio||current!==generation.current)return;
    try{await audio.play();if(current===generation.current){clearTimeout(timer.current);setPhase("playing");setStatus(copy.playingAudio);}}
    catch{if(current===generation.current){clearTimeout(timer.current);setPhase("prepared");setStatus(copy.playPreparedAudio);}}
  }
  async function playVerdict(item:Prepared,current:number){
    if(current!==generation.current||!item.cueKey||item.stage!=="identity")return;
    item.stage="cue";item.audio.onended=null;
    const request=new AbortController();controller.current=request;setPhase("checking");setStatus(copy.checkRecord);
    timer.current=setTimeout(()=>{if(current===generation.current)invalidate(new RecordLookupError("unavailable"));},10000);
    try{
      const record=await readCurrentRecord(token,request.signal);if(current!==generation.current)return;
      if(buildSpeechScript(record,item.language,item.kind).text!==item.script.text||cueFor(record,item.kind)!==item.cueKey)throw new RecordLookupError("unavailable");
      onRecord?.(record);
      item.cue=new Audio(`/audio/prompts/${item.script.language}-${item.cueKey}.mp3`);
      item.cue.onended=()=>{if(current===generation.current)readingFinished();};
      item.cue.onerror=()=>{if(current===generation.current){setMode("device");onVoiceChoice?.("device");void speak(item.kind,"device",item.language);}};
      await playAudio(item,current);
    }catch(error){if(current===generation.current)invalidate(error);}
  }
  async function deviceVoice(script: SpeechScript, current: number, signal: AbortSignal) {
    const synth = window.speechSynthesis;
    let voices = synth.getVoices?.() ?? [];
    const locale = (value: string) => value.replaceAll("_", "-").toLowerCase();
    const matching = () => voices.find(v => locale(v.lang) === locale(locales[script.language])) ?? voices.find(v => locale(v.lang).split("-")[0] === script.language);
    let waitedForVoice = false;
    if (!matching() && synth.addEventListener) {
      waitedForVoice = true;
      await new Promise<void>(resolve => {
        const finish = () => { clearTimeout(wait); synth.removeEventListener("voiceschanged", changed); signal.removeEventListener("abort", finish); resolve(); };
        const changed = () => { voices = synth.getVoices?.() ?? []; if (matching()) finish(); };
        const wait = setTimeout(finish, 2500);
        synth.addEventListener("voiceschanged", changed); signal.addEventListener("abort", finish, { once: true });
        changed();
      });
      voices = synth.getVoices?.() ?? [];
    }
    if (current !== generation.current || signal.aborted) return;
    if (waitedForVoice) {
      // Voice discovery is asynchronous. Never play a record revoked or changed
      // while Android was loading its voice list.
      timer.current = setTimeout(() => { if (current === generation.current) invalidate(new RecordLookupError("unavailable")); }, 10000);
      const fresh = await readCurrentRecord(token, signal);
      if (current !== generation.current || signal.aborted) return;
      clearTimeout(timer.current);
      if (decorate(buildSpeechScript(fresh, script.language, lastKind.current), fresh, lastKind.current).text !== script.text) throw new RecordLookupError("unavailable");
      onRecord?.(fresh);
    }
    const voice = matching();
    // Android can speak English before its voice enumeration exposes an English
    // entry. Leave voice unset so the OS resolves lang; never assign a foreign voice.
    if (!voice && script.language !== "en") { setPhase("idle"); setOfferEnglish(true); setStatus(copy.deviceVoiceUnavailable); return; }
    const utterance = new SpeechSynthesisUtterance(script.text); utteranceRef.current = utterance;
    utterance.lang = locales[script.language]; if (voice) utterance.voice = voice;
    const failure = () => { if (current !== generation.current) return; cancelWork(); setPhase("idle"); setOfferDevice(true); setFailed(true); setStatus(autoCommands ? automaticVoiceCopy[language].tapToRead : copy.speechFailed); };
    utterance.onend = () => { if (current === generation.current) readingFinished(); };
    utterance.onerror = failure;
    utterance.onstart = () => { if (current === generation.current) { clearTimeout(speechStartTimer.current); setStatus(copy.playingAudio); } };
    setPhase("playing"); setStatus(mode === "online" ? `${copy.onlineVoiceFallback} ${copy.playingAudio}` : copy.playingAudio);
    speechStartTimer.current = setTimeout(failure, 4000);
    try { synth.resume?.(); synth.speak(utterance); } catch { failure(); }
  }
  async function playPrepared() {
    const item = prepared.current; if (!item || disabled) return;
    const current = generation.current, request = new AbortController(); controller.current = request;
    setPhase("checking"); setStatus(copy.checkRecord);
    timer.current = setTimeout(() => { if (current === generation.current) invalidate(new RecordLookupError("unavailable")); }, 10000);
    try {
      const record = await readCurrentRecord(token, request.signal);
      if (current !== generation.current) return;
      if (buildSpeechScript(record, item.language, item.kind).text !== item.script.text || cueFor(record,item.kind)!==item.cueKey) throw new RecordLookupError("unavailable");
      onRecord?.(record); clearTimeout(timer.current);
      await playAudio(item,current);
    } catch (error) { if (current === generation.current) invalidate(error); }
  }
  async function speak(kind: SpeechKind = "full", voiceMode: VoiceMode = mode, requested: Language = language) {
    if (disabled) return;
    claimAutomaticRead();
    cancelWork(); setCueUnavailable(false);setOfferDevice(false); setOfferEnglish(false); setTranscript(null); setFailed(false); lastKind.current = kind;
    const current = generation.current, request = new AbortController(); controller.current = request;
    setPhase("checking"); setStatus(copy.checkRecord);
    timer.current = setTimeout(() => { if (generation.current === current) invalidate(new RecordLookupError("unavailable")); }, 10000);
    try {
      const record = await readCurrentRecord(token, request.signal);
      if (current !== generation.current) return;
      onRecord?.(record);
      const script = buildSpeechScript(record, requested, kind);
      setTranscript(decorate(script,record,kind));
      if (voiceMode === "device" && (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined")) { clearTimeout(timer.current); setPhase("idle"); setStatus(language === "en" ? "Speech is unavailable in this browser. Use your screen reader." : copy.deviceVoiceUnavailable); return; }
      if (voiceMode === "device") { clearTimeout(timer.current); await deviceVoice(decorate(script,record,kind), current, request.signal); return; }
      const suffix = kind === "full" ? "" : "/" + kind;
      let response: Response | null = null;
      try { response = await fetch(`/api/public/tags/${encodeURIComponent(token)}/speech${suffix}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: requested }), cache: "no-store", signal: request.signal }); }
      catch { if (request.signal.aborted) return; }
      if (current !== generation.current) return;
      if (!response?.ok) {
        if (response && [410, 409, 404].includes(response.status)) throw new RecordLookupError(response.status === 410 ? "revoked" : response.status === 409 ? "pending" : "unknown");
        const fresh = await readCurrentRecord(token, request.signal);
        if (current !== generation.current) return;
        onRecord?.(fresh); const fallback = decorate(buildSpeechScript(fresh, requested, kind),fresh,kind); setTranscript(fallback); clearTimeout(timer.current);
        setMode("device"); onVoiceChoice?.("device");
        if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") { setPhase("idle"); setOfferDevice(true); setStatus(copy.deviceVoiceUnavailable); return; }
        await deviceVoice(fallback, current, request.signal); return;
      }
      if (!response.headers.get("content-type")?.startsWith("audio/mpeg") || response.headers.get("x-medot-language") !== script.language || response.headers.get("x-medot-language-fallback") !== String(script.usedFallback) || Number(response.headers.get("content-length")) > MAX_AUDIO_BYTES) throw new RecordLookupError("unavailable");
      const bytes = await response.arrayBuffer();
      if (current !== generation.current) return;
      if (!bytes.byteLength || bytes.byteLength > MAX_AUDIO_BYTES) throw new RecordLookupError("unavailable");
      const fresh = await readCurrentRecord(token, request.signal);
      if (current !== generation.current) return;
      if (buildSpeechScript(fresh, requested, kind).text !== script.text || cueFor(fresh,kind)!==cueFor(record,kind)) throw new RecordLookupError("unavailable");
      onRecord?.(fresh); clearTimeout(timer.current);
      objectUrl.current = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
      const audio = new Audio(objectUrl.current);const item:Prepared={audio,script,kind,language:requested,cueKey:cueFor(fresh,kind),stage:"identity"};prepared.current=item;
      audio.onended = () => { if (current === generation.current) { if(item.cueKey)void playVerdict(item,current);else readingFinished(); } };
      audio.onerror = () => { if (current === generation.current) { setMode("device");onVoiceChoice?.("device");void speak(kind,"device",requested); } };
      await playAudio(item,current);
    } catch (error) { if (current === generation.current) invalidate(error); }
  }
  const command = (value: VoiceCommand) => { if (value === "STOP") stop(); else void speak(value === "REPEAT" ? "full" : value === "DETAILS" ? "details" : value === "EXPIRY" ? "expiry" : "instructions"); };
  useImperativeHandle(ref,()=>({read:()=>void speak(),stop}));
  return <div className="patient-speech">
    <label htmlFor="reading-voice">{copy.voiceChoice}</label><select id="reading-voice" value={mode} disabled={disabled} onChange={e => { stop(); setMode(e.target.value as VoiceMode);onVoiceChoice?.(e.target.value as VoiceMode); }}><option value="online">{copy.onlineVoice}</option><option value="device">{copy.deviceVoice}</option></select>
    <button ref={readButton} className="speak-button" type="button" disabled={disabled || phase === "checking"} onClick={() => void speak()}>{copy.readAloud}</button>
    {phase !== "idle" && <button type="button" onClick={stop}>{copy.stopReading}</button>}
    {phase === "prepared" && <button type="button" onClick={() => void playPrepared()}>{copy.playPreparedAudio}</button>}
    {offerDevice && <button type="button" onClick={() => { setMode("device");onVoiceChoice?.("device"); void speak(lastKind.current, "device"); }}>{copy.useDeviceVoice}</button>}
    {offerEnglish && <button type="button" onClick={() => { setMode("device");onVoiceChoice?.("device"); void speak(lastKind.current, "device", "en"); }}>{copy.useEnglishVoice}</button>}
    {cueUnavailable&&<p role="status">{copy.cueAudioUnavailable}</p>}
    {status && <p role={failed ? "alert" : "status"}>{status}</p>}
    {transcript && <details className="speech-transcript"><summary>{copy.transcript}</summary>{(transcript.usedFallback || transcript.language !== language) && <p>{copy.instructionFallback}</p>}<p lang={transcript.language}>{transcript.text}</p></details>}
    <VoiceControls ref={voiceControls} language={language} automatic={autoCommands} autoListen={autoCommands ? listenRequest : 0} autoReady={phase === "idle"} busy={disabled || phase === "checking"} disabled={disabled} onListen={() => { claimAutomaticRead(); cancelWork(); setPhase("idle"); setStatus(""); setFailed(false); }} onCommand={command} />
  </div>;
}
