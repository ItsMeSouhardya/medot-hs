// @vitest-environment jsdom
import { afterEach,expect,it,vi } from "vitest";
import { cleanup,fireEvent,render,screen } from "@testing-library/react";
import { mkdir,writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import FindMedicine from "@/components/finder/find-medicine";
import { dictionaries,type Language } from "@/lib/i18n";
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("renders localized fresh finder verdicts without speech or persistent session storage",async()=>{
  const token="abcdefghijklmnopqrstuv";
  const destination=resolve(process.cwd(),"../.superpowers/sdd/2026-10-02-medot-feature-expansion/views");
  const save=process.env.MEDOT_EXPORT_E4_FIXTURES==="1";
  if(save)await mkdir(destination,{recursive:true});
  const speak=vi.fn();vi.stubGlobal("speechSynthesis",{cancel:vi.fn(),speak,getVoices:()=>[]});
  for(const language of ["en","bn","hi"] as Language[])for(const state of ["choosing","match","wrong","expired","timing","unavailable"]){
    const copy=dictionaries[language];
    const record={token,medicineId:"fictional-software",genericName:"Fictional software label",strength:"Fixture strength",dosageForm:"Fixture form",batchNumber:"SOFTWARE",expiryMonth:state==="expired"?"2000-01":"2099-12",instruction:"Software demonstration only.",instructionBn:"শুধুমাত্র ডেমো।",instructionHi:"केवल डेमो।",usageSlots:state==="wrong"?["MORNING"]:state==="timing"?[]:["EVENING"]};
    vi.stubGlobal("fetch",vi.fn(async(url)=>String(url).includes("find-targets")?new Response('{"targets":[]}'):new Response(JSON.stringify(state==="unavailable"?{kind:"revoked"}:{kind:"active",record,expiryState:state==="expired"?"EXPIRED":"CURRENT"}),{status:state==="unavailable"?410:200})));
    const view=render(<FindMedicine initialLanguage={language}/>);
    if(state!=="choosing"){
      fireEvent.change(screen.getByRole("combobox",{name:copy.chooseTarget}),{target:{value:"slot:EVENING"}});fireEvent.click(screen.getByRole("button",{name:copy.confirmTarget}));
      fireEvent.change(screen.getByLabelText(copy.candidateUrl),{target:{value:location.origin+"/m/"+token}});fireEvent.click(screen.getByRole("button",{name:copy.candidateCheck}));
      const verdict={match:copy.candidateMatch,wrong:copy.candidateWrong,expired:copy.candidateExpired,timing:copy.candidateUnknownTiming,unavailable:copy.candidateUnavailable}[state];
      expect(await screen.findByRole("heading",{name:verdict})).toBeTruthy();
      if(state==="unavailable")expect(screen.queryByText(record.genericName)).toBeNull();
    }
    if(save)await writeFile(resolve(destination,`e4-${language}-${state}.html`),`<!doctype html><html lang="${language}"><head><title>E4 ${language} ${state} software fixture</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/globals.css"></head><body><p style="padding:12px;font:14px sans-serif">SOFTWARE FIXTURE. Controls inert; no medicine, provider call or activation.</p>${view.container.innerHTML}</body></html>`);
    view.unmount();cleanup();
  }
  expect(speak).not.toHaveBeenCalled();
},20000);
