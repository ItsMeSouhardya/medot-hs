import { mkdirSync,writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { expect,it,vi } from "vitest";
import PharmacyLayout from "@/app/(operator)/pharmacy/layout";
import Overview from "@/app/(operator)/pharmacy/page";
import Tags from "@/app/(operator)/pharmacy/tags/page";
import Provision from "@/app/(operator)/pharmacy/provision/page";
import Sharing from "@/app/(operator)/pharmacy/sharing/page";
import Reminders from "@/components/reminders/reminders";
import PatientView from "@/components/patient/patient-view";
import type { Language } from "@/lib/i18n";
const state=vi.hoisted(()=>({data:null as unknown}));
vi.mock("@/lib/pharmacy-auth",()=>({getPharmacyAccess:async()=>({kind:"authorized",userId:"software-fixture"}),isPharmacyAuthConfigured:()=>false}));
vi.mock("next/navigation",()=>({usePathname:()=>"/pharmacy",useRouter:()=>({refresh:()=>{}})}));
vi.mock("@/components/pharmacy/sign-out",()=>({default:()=>null}));
vi.mock("@/components/caregiver/private-client",()=>({privateRequest:vi.fn(),usePrivateResource:()=>({data:state.data,busy:false,error:false,run:vi.fn(),refresh:vi.fn(),clear:vi.fn(),setData:vi.fn()})}));
vi.mock("@/lib/operator-tags",async importOriginal=>({...await importOriginal<object>(),getOperatorCounts:async()=>({pending:1,active:1,revoked:1}),listOperatorTags:async()=>tags,findOperatorTag:async()=>tags[0]}));
vi.mock("@/lib/medicine-repository",()=>({listMedicines:async()=>[{id:"software",genericName:"Fictional interface label",strength:"Fixture strength",dosageForm:"Fixture form",catalogStatus:"DEMO_READY",recordKind:"FICTIONAL_DEMO"}]}));
const token="abcdefghijklmnopqrstuv";
const record={token,genericName:"Fictional interface label",strength:"Fixture strength",dosageForm:"Fixture form",batchNumber:"POLISH-SOFTWARE-FIXTURE",expiryMonth:"2099-12",instruction:"Software interface fixture only.",instructionBn:"শুধুমাত্র সফটওয়্যার ডেমো।",instructionHi:"केवल सॉफ़्टवेयर डेमो।"};
const tags=["PENDING","ACTIVE","REVOKED"].map((status,index)=>({...record,token:index===0?token:String(index).repeat(22),medicineId:"software",status,url:"https://medot.example/m/"+(index===0?token:String(index).repeat(22)),activationReady:false,createdAt:"2026-10-03T00:00:00Z",usageSlots:[],recordKind:"FICTIONAL_DEMO"}));
it("exports actual page templates with fictional resolver/auth fixtures for visual review",async()=>{
  const output=resolve(process.cwd(),"../.superpowers/sdd/2026-10-02-medot-feature-expansion/ui-views");mkdirSync(output,{recursive:true});
  function save(name:string,element:React.ReactNode,language="en"){
    const html=renderToStaticMarkup(element);expect(html).not.toContain("software-fixture</");
    writeFileSync(resolve(output,name+".html"),`<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/globals.css"><link rel="stylesheet" href="/pharmacy.css"><style>@font-face{font-family:FixtureManrope;src:url('/fonts/manrope.ttf')}body{--font-heading:FixtureManrope}</style></head><body><p style="font:12px sans-serif;padding:8px;margin:0;background:#ddede5">SOFTWARE VISUAL FIXTURE. No signed-in account, medicine activation or functional notification.</p>${html}</body></html>`);
  }
  for(const [name,page] of [["overview",()=>Overview()],["provision",()=>Provision()],["tags",()=>Tags({searchParams:Promise.resolve({})})],["detail",()=>Tags({searchParams:Promise.resolve({tag:token})})],["sharing",()=>Sharing()]] as const){save("pharmacy-"+name,await PharmacyLayout({children:await page()}));}
  for(const language of ["en","bn","hi"] as Language[]){
    for(const mode of ["off","on","unavailable"]){
      state.data={configured:true,publicKey:"fixture",enabled:mode!=="off",expiresAt:"2099-12-31T00:00:00Z",reminders:mode==="off"?[]:[{id:"fixture",token,time:"19:30",language,enabled:true,nextDue:"2099-01-01",available:mode!=="unavailable"}]};
      save(`reminder-${language}-${mode}`,<Reminders initialLanguage={language}/>,language);
    }
    state.data=null;
    for(const mode of ["active","expired","pending","revoked","unknown","unavailable"] as const){
      const lookup=mode==="active"||mode==="expired"?{kind:"active" as const,record:{...record,expiryMonth:mode==="expired"?"2000-01":"2099-12"}}:{kind:mode};
      save(`patient-${language}-${mode}`,<PatientView token={token} initialLookup={lookup} initialLanguage={language}/>,language);
    }
  }
  state.data=null;
});
