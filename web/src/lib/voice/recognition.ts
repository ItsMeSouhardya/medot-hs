import { locales, type Language } from "../i18n";
export type RecognitionResult = { isFinal: boolean; length: number; [index: number]: { transcript: string } };
export type RecognitionInstance = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
  start(): void; abort(): void;
};
type RecognitionConstructor = new () => RecognitionInstance;
function constructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const browser = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}
export function recognitionAvailable(): boolean { return Boolean(constructor()); }
export function startRecognition(language: Language, onText: (text: string) => void, onEnd: () => void, onError: () => void): () => void {
  const Constructor = constructor();
  if (!Constructor) { onError(); return () => {}; }
  let recognition: RecognitionInstance;
  try { recognition = new Constructor(); } catch { onEnd(); onError(); return () => {}; }
  let active = true;
  const finish = () => {
    if (!active) return;
    active = false; clearTimeout(timer);
    recognition.onresult = null; recognition.onerror = null; recognition.onend = null;
    try { recognition.abort(); } catch {}
    onEnd();
  };
  recognition.lang = locales[language]; recognition.continuous = false; recognition.interimResults = false; recognition.maxAlternatives = 1;
  recognition.onresult = event => {
    if (!active) return;
    const result = event.results[0];
    if (!result?.isFinal) return;
    const text = event.results.length === 1 && result.length === 1 ? result[0].transcript : "";
    finish(); onText(text);
  };
  recognition.onerror = () => { if (!active) return; finish(); onError(); };
  recognition.onend = finish;
  const timer = setTimeout(() => { finish(); onError(); }, 10000);
  try { recognition.start(); } catch { finish(); onError(); }
  return finish;
}
