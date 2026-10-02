"use client";

import { useState } from "react";
import MedotLogo from "../brand/medot-logo";
import Icon from "./icon";

export type PreviewLanguage = "en" | "bn" | "hi";
const previews = {
  en: { heading: "Medicine information", instruction: "Recorded instruction", action: "Read information aloud", note: "Your pharmacist’s recorded details appear here." },
  bn: { heading: "ওষুধের তথ্য", instruction: "নথিভুক্ত নির্দেশনা", action: "তথ্য শুনুন", note: "আপনার ফার্মাসিস্টের নথিভুক্ত তথ্য এখানে দেখা যাবে।" },
  hi: { heading: "दवा की जानकारी", instruction: "दर्ज निर्देश", action: "जानकारी सुनें", note: "आपके फार्मासिस्ट की दर्ज जानकारी यहाँ दिखाई देगी।" },
};

export default function LanguagePreview({ initialLanguage = "en" }: { initialLanguage?: PreviewLanguage }) {
  const [language, setLanguage] = useState(initialLanguage);
  const copy = previews[language];
  return (
    <div className="language-preview" id="language-preview" tabIndex={-1}>
      <div className="preview-tabs" role="group" aria-label="Preview language">
        {([['en', 'English'], ['bn', 'বাংলা'], ['hi', 'हिन्दी']] as const).map(([value, label]) => <button key={value} lang={value} aria-pressed={language === value} onClick={() => setLanguage(value)}>{label}</button>)}
      </div>
      <div className="preview-record" lang={language} aria-live="polite" aria-atomic="true">
        <MedotLogo variant="mark" />
        <h3>{copy.heading}</h3>
        <p>{copy.note}</p>
        <div className="preview-instruction"><span>{copy.instruction}</span><div className="preview-line" /><div className="preview-line short" /></div>
        <button disabled><Icon name="sound" />{copy.action}</button>
      </div>
      <p className="preview-caption">Illustrative interface. No medicine or prescription is shown, and this preview does not play audio.</p>
    </div>
  );
}
