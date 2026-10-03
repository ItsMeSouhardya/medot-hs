"use client";
import { languages,languageNames,type Language } from "@/lib/i18n";
import { sharingCopy } from "@/lib/caregiver/copy";
export default function LanguageControl({language,setLanguage}:{language:Language;setLanguage:(language:Language)=>void}){
  return <label>{sharingCopy[language].language}<select value={language} onChange={event=>setLanguage(event.target.value as Language)}>{languages.map(code=><option key={code} value={code} lang={code}>{languageNames[code]}</option>)}</select></label>;
}
