"use client";
import { useCallback, useEffect, useEffectEvent, useImperativeHandle, useRef, useState, type Ref } from "react";
import { dictionaries, type Language } from "@/lib/i18n";
import { parseVoiceCommand, type VoiceCommand } from "@/lib/voice/commands";
import { recognitionAvailable, startRecognition } from "@/lib/voice/recognition";
import { automaticVoiceCopy } from "@/lib/voice/copy";
export type VoiceControlsHandle = { stop(): void };
export default function VoiceControls({ ref, language, busy, disabled = false, autoListen = 0, autoReady = true, automatic = false, onListen, onCommand }: { ref?: Ref<VoiceControlsHandle>; language: Language; busy: boolean; disabled?: boolean; autoListen?: number; autoReady?: boolean; automatic?: boolean; onListen?(): void; onCommand(command: VoiceCommand): void }) {
  const copy = dictionaries[language];
  const [listening, setListening] = useState(false), [status, setStatus] = useState("");
  const [scope, setScope] = useState({ language, busy, disabled });
  if (scope.language !== language || scope.busy !== busy || scope.disabled !== disabled) {
    setScope({ language, busy, disabled }); setListening(false); setStatus("");
  }
  const stop = useRef<(() => void) | null>(null);
  const generation = useRef(0);
  const lastAutomatic = useRef(0);
  const automaticTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancelWork = useCallback(() => { clearTimeout(automaticTimer.current); generation.current++; stop.current?.(); stop.current = null; }, []);
  const cancel = useCallback(() => { cancelWork(); setListening(false); setStatus(""); }, [cancelWork]);
  useImperativeHandle(ref, () => ({ stop: cancel }), [cancel]);
  useEffect(() => {
    cancelWork();
    const hide = () => { if (document.visibilityState === "hidden") cancel(); };
    document.addEventListener("visibilitychange", hide); window.addEventListener("pagehide", cancel);
    return () => { cancelWork(); document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", cancel); };
  }, [language, busy, disabled, cancel, cancelWork]);
  const automaticListen = useEffectEvent(() => listen(true));
  useEffect(() => {
    if (!autoListen || autoListen === lastAutomatic.current || !autoReady || busy || disabled || document.visibilityState === "hidden") return;
    lastAutomatic.current = autoListen;
    const timer = setTimeout(() => automaticListen(), 250); automaticTimer.current = timer;
    return () => clearTimeout(timer);
  }, [autoListen, autoReady, busy, disabled]);
  function command(value: VoiceCommand) { cancelWork(); setListening(false); setStatus(""); onCommand(value); }
  function listen(fromAutomatic = false) {
    if (disabled || busy || listening || document.visibilityState === "hidden") return;
    if (!recognitionAvailable()) { setStatus(copy.recognitionUnavailable); return; }
    if (!fromAutomatic) onListen?.();
    const current = ++generation.current;
    setListening(true); setStatus(copy.listening);
    stop.current = startRecognition(language, text => {
      if (current !== generation.current) return;
      const parsed = parseVoiceCommand(text, language);
      if (parsed) { setStatus(""); command(parsed); } else setStatus(copy.commandUnknown);
    }, () => { if (current === generation.current) { setListening(false); setStatus(""); } }, () => { if (current === generation.current) setStatus(copy.recognitionFailed); });
  }
  return <section className="voice-controls" aria-label={copy.voiceGuidance}>
    <button type="button" disabled={disabled} onClick={() => command("REPEAT")}>{copy.voiceGuidance}</button>
    <p id="microphone-explanation" className="small-note">{automatic ? automaticVoiceCopy[language].explanation : copy.microphoneExplanation}</p>
    <button type="button" disabled={disabled || busy || listening} aria-describedby="microphone-explanation" onClick={() => listen()}>{copy.listenCommand}</button>
    <div className="voice-command-buttons">
      <button type="button" disabled={disabled} onClick={() => command("REPEAT")}>{copy.repeat}</button>
      <button type="button" disabled={disabled} onClick={() => command("DETAILS")}>{copy.moreInformation}</button>
      <button type="button" disabled={disabled} onClick={() => command("EXPIRY")}>{copy.expiryQuestion}</button>
      <button type="button" disabled={disabled} onClick={() => command("INSTRUCTIONS")}>{copy.instructionsAgain}</button>
      <button type="button" onClick={() => command("STOP")}>{copy.stop}</button>
    </div>
    {status && <p role="status">{status}</p>}
  </section>;
}
