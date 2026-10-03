"use client";
import { useEffect, useRef, useState } from "react";
import { dictionaries, type Language } from "@/lib/i18n";
import { parseVoiceCommand, type VoiceCommand } from "@/lib/voice/commands";
import { recognitionAvailable, startRecognition } from "@/lib/voice/recognition";
export default function VoiceControls({ language, busy, disabled = false, onCommand }: { language: Language; busy: boolean; disabled?: boolean; onCommand(command: VoiceCommand): void }) {
  const copy = dictionaries[language];
  const [listening, setListening] = useState(false), [status, setStatus] = useState("");
  const stop = useRef<(() => void) | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    const cancelWork = () => { generation.current++; stop.current?.(); stop.current = null; };
    const cancel = () => { cancelWork(); setListening(false); setStatus(""); };
    cancel();
    const hide = () => { if (document.visibilityState === "hidden") cancel(); };
    document.addEventListener("visibilitychange", hide); window.addEventListener("pagehide", cancel);
    return () => { cancelWork(); document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", cancel); };
  }, [language, busy]);
  function command(value: VoiceCommand) { generation.current++; stop.current?.(); stop.current = null; setListening(false); setStatus(""); onCommand(value); }
  function listen() {
    if (busy || listening) return;
    if (!recognitionAvailable()) { setStatus(copy.recognitionUnavailable); return; }
    const current = ++generation.current;
    setListening(true); setStatus(copy.listening);
    stop.current = startRecognition(language, text => {
      if (current !== generation.current) return;
      const parsed = parseVoiceCommand(text, language);
      if (parsed) { setStatus(""); command(parsed); } else setStatus(copy.commandUnknown);
    }, () => { if (current === generation.current) setListening(false); }, () => { if (current === generation.current) setStatus(copy.recognitionFailed); });
  }
  return <section className="voice-controls" aria-label={copy.voiceGuidance}>
    <button type="button" disabled={disabled} onClick={() => command("REPEAT")}>{copy.voiceGuidance}</button>
    <p id="microphone-explanation" className="small-note">{copy.microphoneExplanation}</p>
    <button type="button" disabled={disabled || busy || listening} aria-describedby="microphone-explanation" onClick={listen}>{copy.listenCommand}</button>
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
