// @vitest-environment jsdom
import { afterEach,expect,it,vi } from "vitest";
import { cleanup,fireEvent,render,screen,waitFor,within } from "@testing-library/react";
import { mkdir,writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import MedicationDetective from "@/components/finder/medication-detective";
import { dictionaries,type Language } from "@/lib/i18n";
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
it("renders five long localized strips and honest fresh summaries without automatic speech or storage",async()=>{
  const destination=resolve(process.cwd(),"../.superpowers/sdd/2026-10-02-medot-feature-expansion/views");
  const save=process.env.MEDOT_EXPORT_E5_FIXTURES==="1";if(save)await mkdir(destination,{recursive:true});
  const speak=vi.fn(),store=vi.spyOn(Storage.prototype,"setItem");vi.stubGlobal("speechSynthesis",{cancel:vi.fn(),speak,getVoices:()=>[]});
  for(const language of ["en","bn","hi"] as Language[])for(const state of ["choosing","collecting","one","multiple","none","expired","incomplete"]){
    const copy=dictionaries[language];let finishing=false;
    const records=Array.from({length:5},(_,i)=>({token:`abcdefghijklmnopqrstu${i}`,medicineId:`software-${i}`,genericName:`Fictional ${i} / সফটওয়্যার নমুনা / सॉफ़्टवेयर नमूना`,brandName:"Fictional brand / ফিক্সচার / नमूना",strength:"Fixture strength / ফিক্সচার / नमूना",dosageForm:"Fixture form / ফিক্সচার / नमूना",batchNumber:"SOFTWARE",expiryMonth:state==="expired"&&i===2?"2000-01":"2099-12",instruction:"Software demonstration only.",instructionBn:"শুধুমাত্র ডেমো।",instructionHi:"केवल डेमो।",usageSlots:i===4?[]:state==="none"?["MORNING"]:i===2||state==="multiple"&&i===3?["EVENING","NIGHT"]:i===1?["AFTERNOON"]:["MORNING"]}));
    vi.stubGlobal("fetch",vi.fn(async url=>{const index=Number(String(url).at(-1));return finishing&&state==="incomplete"&&index===1?new Response('{"kind":"revoked"}',{status:410}):new Response(JSON.stringify({kind:"active",record:records[index],expiryState:records[index].expiryMonth==="2000-01"?"EXPIRED":"CURRENT"}));}));
    const view=render(<MedicationDetective initialLanguage={language}/>);
    if(state!=="choosing"){
      fireEvent.change(screen.getByRole("combobox",{name:copy.detectiveTiming}),{target:{value:"EVENING"}});fireEvent.click(screen.getByRole("button",{name:copy.confirmTarget}));
      for(const record of records){
        fireEvent.change(screen.getByLabelText(copy.candidateUrl),{target:{value:location.origin+"/m/"+record.token}});fireEvent.click(screen.getByRole("button",{name:copy.candidateCheck}));
        await waitFor(()=>expect(within(screen.getByRole("region",{name:copy.detectiveScanned})).getByText(record.genericName)).toBeTruthy());
      }
      expect(screen.getByText(`${copy.detectiveCount}: 5 / 5`)).toBeTruthy();
      if(state!=="collecting"){
        finishing=true;fireEvent.click(screen.getByRole("button",{name:copy.detectiveFinish}));
        const heading=state==="none"?copy.detectiveNone:state==="multiple"?copy.detectiveMultiple:state==="incomplete"?copy.detectiveIncomplete:copy.detectiveOne;
        expect(await screen.findByRole("heading",{name:heading})).toBeTruthy();
        if(state==="incomplete")expect(screen.queryByText(records[1].genericName)).toBeNull();
        expect(vi.mocked(fetch).mock.calls).toHaveLength(10);
      }
      for(const [url,options] of vi.mocked(fetch).mock.calls){expect(String(url)).toMatch(/^\/api\/public\/tags\/[A-Za-z0-9_-]{22}$/);expect((options as RequestInit).cache).toBe("no-store");expect((options as RequestInit).method).toBeUndefined();}
    }
    if(save)await writeFile(resolve(destination,`e5-${language}-${state}.html`),`<!doctype html><html lang="${language}"><head><title>E5 ${language} ${state} software fixture</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/globals.css"></head><body><p style="padding:12px;font:14px sans-serif">SOFTWARE FIXTURE. Controls inert; no medicine, provider call or activation.</p>${view.container.innerHTML}</body></html>`);
    view.unmount();cleanup();
  }
  expect(speak).not.toHaveBeenCalled();expect(store).not.toHaveBeenCalled();
},20000);
