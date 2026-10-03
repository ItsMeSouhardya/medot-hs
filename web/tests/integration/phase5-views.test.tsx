import { mkdirSync,writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { expect,it,vi } from "vitest";
import type { Language } from "@/lib/i18n";
import { sharingCopy } from "@/lib/caregiver/copy";
import SharingControls from "@/components/caregiver/sharing-controls";
import CaregiverDashboard from "@/components/caregiver/dashboard";
import ShareIdentification from "@/components/patient/share-identification";
const state=vi.hoisted(()=>({data:null as unknown}));
vi.mock("@/components/caregiver/private-client",()=>({privateRequest:vi.fn(),usePrivateResource:()=>({data:state.data,busy:false,error:false,run:vi.fn(),refresh:vi.fn(),clear:vi.fn(),setData:vi.fn()})}));
const token="abcdefghijklmnopqrstuv",record={token,medicineId:"fixture",genericName:"Fictional interface label",strength:"Fixture strength",dosageForm:"Fixture form",batchNumber:"SOFTWARE-FIXTURE",expiryMonth:"2000-01",instruction:"Interface fixture only.",instructionBn:"শুধুমাত্র ইন্টারফেস ডেমো।",instructionHi:"केवल इंटरफ़ेस डेमो।",usageSlots:["EVENING"],recordKind:"FICTIONAL_DEMO"};
const members=Array.from({length:5},(_,index)=>({token:index===0?token:String(index).repeat(22),alias:"Strip "+(index+1),selected:true}));
const output=resolve(process.cwd(),"../.superpowers/sdd/2026-10-02-medot-feature-expansion/views");
it("renders localized owner, caregiver and manual confirmation fixtures without claiming real sessions",()=>{
  mkdirSync(output,{recursive:true});let count=0;
  for(const language of ["en","bn","hi"] as Language[])for(const view of ["locked","off","on","status","details","share"]){
    state.data=view==="locked"?null:view==="off"||view==="on"?{groupId:"fixture",enabled:view==="on",version:1,scopes:{status:view==="on",details:view==="on"},expiresAt:view==="on"?"2099-12-31T00:00:00Z":null,members,grants:view==="on"?[{id:"fixture"}]:[]}:view==="share"?[{token,alias:"Strip 1",record}]:[{id:"fixture",statuses:members.map((member,index)=>({alias:member.alias,available:index!==4,pairingVerified:index===0,slots:index===4?[]:[{slot:index===3?"AS_NEEDED":"EVENING",state:index===3?"OPTIONAL":index===0?"SHARED":"NO_CHECK_IN",...(index===0?{outcome:"EXPIRED_LABEL"}:{})}],...(view==="details"&&index!==4?{details:record}:{})}))}];
    const element=view==="share"?<ShareIdentification token={token} language={language}/>:view==="status"||view==="details"?<CaregiverDashboard initialLanguage={language}/>:<SharingControls initialLanguage={language}/>;
    const html=renderToStaticMarkup(element);expect(html).toContain(sharingCopy[language].privacy);expect(html).not.toContain("<script");
    if(view==="status")expect(html).not.toContain(record.genericName);if(view==="details")expect(html).toContain(record.genericName);if(view==="off")expect(html).toContain(sharingCopy[language].off);
    writeFileSync(resolve(output,`e7-${language}-${view}.html`),`<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/globals.css"></head><body>${html}</body></html>`);count++;
  }expect(count).toBe(18);state.data=null;
});
