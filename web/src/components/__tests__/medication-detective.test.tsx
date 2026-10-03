// @vitest-environment jsdom
import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { act,cleanup,fireEvent,render,screen,waitFor,within } from "@testing-library/react";
import MedicationDetective from "../finder/medication-detective";
import type { PublicRecord } from "@/lib/tag-repository";
const token=(index:number)=>`abcdefghijklmnopqrstu${index}`;
const record=(index:number,slots:PublicRecord["usageSlots"]=["EVENING"]):PublicRecord=>({token:token(index),medicineId:"same-catalog-identity",genericName:`Fictional strip ${index}`,strength:"Fixture",dosageForm:"Fixture",batchNumber:"SOFTWARE",expiryMonth:"2099-12",instruction:"Software only.",usageSlots:slots});
const active=(r:PublicRecord)=>new Response(JSON.stringify({kind:"active",record:r,expiryState:"CURRENT"}));
beforeEach(()=>{vi.stubGlobal("fetch",vi.fn(async url=>active(record(Number(String(url).at(-1))))));vi.stubGlobal("speechSynthesis",{cancel:vi.fn(),speak:vi.fn(),getVoices:()=>[]});});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
function confirm(){fireEvent.change(screen.getByRole("combobox",{name:"Which recorded timing are you looking for?"}),{target:{value:"EVENING"}});fireEvent.click(screen.getByRole("button",{name:"Confirm target"}));}
function enter(index:number){fireEvent.change(screen.getByLabelText("Canonical MEDOT URL"),{target:{value:location.origin+"/m/"+token(index)}});fireEvent.click(screen.getByRole("button",{name:"Check this URL"}));}
const list=()=>within(screen.getByRole("region",{name:"Scanned strips"}));
async function scan(index:number){enter(index);await waitFor(()=>expect(list().getByText(`Fictional strip ${index}`)).toBeTruthy());}
it("confirms timing before scanning and starts no automatic microphone or speech",()=>{
  render(<MedicationDetective/>);expect(screen.queryByLabelText("Canonical MEDOT URL")).toBeNull();expect(fetch).not.toHaveBeenCalled();confirm();expect(screen.getByLabelText("Canonical MEDOT URL")).toBeTruthy();expect(speechSynthesis.speak).not.toHaveBeenCalled();
});
it("collects five unique tags, updates duplicates and refuses a sixth without fetching it",async()=>{
  render(<MedicationDetective/>);confirm();for(let i=0;i<5;i++)await scan(i);
  expect(screen.getByText("Distinct tags scanned: 5 / 5")).toBeTruthy();
  await scan(0);expect(list().getAllByText("Fictional strip 0")).toHaveLength(1);
  const before=vi.mocked(fetch).mock.calls.length;enter(5);expect(await screen.findByText("Five distinct tags are already collected. Finish or reset the session.")).toBeTruthy();expect(fetch).toHaveBeenCalledTimes(before);expect(list().queryByText("Fictional strip 5")).toBeNull();
});
it("Finish refreshes all records and reports multiple matches without choosing the first",async()=>{
  render(<MedicationDetective/>);confirm();await scan(0);await scan(1);
  vi.mocked(fetch).mockImplementation(async url=>active(record(Number(String(url).at(-1)),["EVENING","NIGHT"])));
  fireEvent.click(screen.getByRole("button",{name:"Finish scanning"}));
  expect(await screen.findByRole("heading",{name:"More than one recorded match among the strips scanned"})).toBeTruthy();
  expect(screen.getByText("More than one medicine matches. Review each result. MEDOT will not choose one for you.")).toBeTruthy();expect(screen.getAllByRole("button",{name:"Scan this strip again"})).toHaveLength(2);
  expect(fetch).toHaveBeenCalledTimes(4);
});
it("a revoked Finish lookup clears its old identity and prevents a confident single result",async()=>{
  render(<MedicationDetective/>);confirm();await scan(0);await scan(1);
  vi.mocked(fetch).mockImplementation(async url=>String(url).endsWith(token(0))?new Response('{"kind":"revoked"}',{status:410}):active(record(1)));
  fireEvent.click(screen.getByRole("button",{name:"Finish scanning"}));
  expect(await screen.findByRole("heading",{name:"Incomplete result among the strips scanned"})).toBeTruthy();expect(screen.queryByText("Fictional strip 0")).toBeNull();expect(screen.queryByRole("heading",{name:"One recorded match among the strips scanned"})).toBeNull();expect(list().getByText("Fictional strip 1")).toBeTruthy();
});
it("keeps failed candidate tokens for Finish and never silently drops unavailable coverage",async()=>{
  render(<MedicationDetective/>);confirm();await scan(0);vi.mocked(fetch).mockResolvedValue(new Response('{"kind":"unavailable"}',{status:503}));enter(1);
  await waitFor(()=>expect(screen.getByText("Distinct tags scanned: 2 / 5")).toBeTruthy());await waitFor(()=>expect(screen.queryByText("Checking this candidate's current record.")).toBeNull());
  fireEvent.click(screen.getByRole("button",{name:"Finish scanning"}));expect(await screen.findByRole("heading",{name:"Incomplete result among the strips scanned"})).toBeTruthy();expect(screen.queryByText("Fictional strip 0")).toBeNull();
});
it("uses fresh timing at Finish, warns for expired matches and displays unclassified strips",async()=>{
  render(<MedicationDetective/>);confirm();await scan(0);await scan(1);await scan(2);
  vi.mocked(fetch).mockImplementation(async url=>{const i=Number(String(url).at(-1));return active({...record(i,i===0?["MORNING"]:i===1?[]:["EVENING"]),expiryMonth:i===2?"2000-01":"2099-12"});});
  fireEvent.click(screen.getByRole("button",{name:"Finish scanning"}));await screen.findByRole("heading",{name:"One recorded match among the strips scanned"});
  expect(screen.getByText("Some scanned strips have no recorded timing. They cannot be classified.")).toBeTruthy();
  const card=list().getByText("Fictional strip 2").closest("article")!;expect(card.innerHTML.indexOf("The labelled expiry has passed")).toBeLessThan(card.innerHTML.indexOf("Fictional strip 2"));
});
it("Stop or hide discards a late Finish response and resets all collected identities",async()=>{
  let resolve!:(r:Response)=>void;render(<MedicationDetective/>);confirm();await scan(0);
  vi.mocked(fetch).mockImplementation(()=>new Promise(r=>{resolve=r;}));fireEvent.click(screen.getByRole("button",{name:"Finish scanning"}));fireEvent.click(screen.getByRole("button",{name:"Stop detective"}));
  await act(async()=>resolve(active(record(0))));expect(screen.queryByText("Fictional strip 0")).toBeNull();expect(screen.queryByRole("heading",{name:/recorded match among/})).toBeNull();confirm();fireEvent(window,new Event("pagehide"));expect(screen.queryByLabelText("Canonical MEDOT URL")).toBeNull();
});
it("retapping locates the exact selected physical token, even when catalog identity is shared",async()=>{
  render(<MedicationDetective/>);confirm();await scan(0);await scan(1);fireEvent.click(screen.getByRole("button",{name:"Finish scanning"}));await screen.findByRole("heading",{name:"More than one recorded match among the strips scanned"});
  const card=list().getByText("Fictional strip 0").closest("article")!;fireEvent.click(within(card).getByRole("button",{name:"Scan this strip again"}));enter(1);
  expect(await screen.findByRole("heading",{name:"This is a different strip"})).toBeTruthy();enter(0);expect(await screen.findByRole("heading",{name:"This is the selected strip"})).toBeTruthy();expect(screen.getByText("Distinct tags scanned: 2 / 5")).toBeTruthy();
});
it("explicit device guidance speaks the refreshed identity and stops on a new scan",async()=>{
  vi.stubGlobal("SpeechSynthesisUtterance",class{constructor(public text:string){}});
  render(<MedicationDetective/>);confirm();fireEvent.change(screen.getByLabelText("Reading voice"),{target:{value:"device"}});fireEvent.click(screen.getByRole("button",{name:"Start voice guidance"}));await scan(0);
  await waitFor(()=>expect(speechSynthesis.speak).toHaveBeenCalledOnce());expect(vi.mocked(speechSynthesis.speak).mock.calls[0][0].text).toContain("Fictional strip 0");
  const before=vi.mocked(speechSynthesis.cancel).mock.calls.length;vi.mocked(fetch).mockImplementation(()=>new Promise(()=>{}));enter(1);await waitFor(()=>expect(vi.mocked(speechSynthesis.cancel).mock.calls.length).toBeGreaterThan(before));
});
it("absent recognition leaves Listen and manual timing selection usable",()=>{
  vi.stubGlobal("SpeechRecognition",undefined);vi.stubGlobal("webkitSpeechRecognition",undefined);
  render(<MedicationDetective/>);fireEvent.click(screen.getByRole("button",{name:"Listen for a target"}));
  expect(screen.getByText("Voice recognition is unavailable. Use the labelled buttons.")).toBeTruthy();expect(screen.getByRole("button",{name:"Listen for a target"}).hasAttribute("disabled")).toBe(false);confirm();
});
it("voice proposes only a timing and still requires explicit confirmation",()=>{
  const instances:{onresult:((e:unknown)=>void)|null}[]=[];
  vi.stubGlobal("SpeechRecognition",class{onresult=null;onerror=null;onend=null;start(){}abort(){}constructor(){instances.push(this);}});
  render(<MedicationDetective/>);expect(instances).toHaveLength(0);fireEvent.click(screen.getByRole("button",{name:"Listen for a target"}));
  act(()=>instances[0].onresult?.({results:[{isFinal:true,length:1,0:{transcript:"Evening"}}]}));
  expect((screen.getByRole("combobox",{name:"Which recorded timing are you looking for?"}) as HTMLSelectElement).value).toBe("EVENING");expect(screen.queryByLabelText("Canonical MEDOT URL")).toBeNull();fireEvent.click(screen.getByRole("button",{name:"Confirm target"}));expect(screen.getByLabelText("Canonical MEDOT URL")).toBeTruthy();
});
it("returns no recorded match for fresh classified strips without inferring a prescription",async()=>{
  vi.mocked(fetch).mockImplementation(async url=>active(record(Number(String(url).at(-1)),["MORNING"])));
  render(<MedicationDetective/>);confirm();await scan(0);fireEvent.click(screen.getByRole("button",{name:"Finish scanning"}));
  expect(await screen.findByRole("heading",{name:"No recorded match among the strips scanned"})).toBeTruthy();expect(screen.queryByRole("button",{name:"Scan this strip again"})).toBeNull();
});
it("a bounded Finish timeout removes old identities and reports incomplete",async()=>{
  render(<MedicationDetective/>);confirm();await scan(0);vi.useFakeTimers();vi.mocked(fetch).mockImplementation(()=>new Promise(()=>{}));
  fireEvent.click(screen.getByRole("button",{name:"Finish scanning"}));expect(screen.queryByText("Fictional strip 0")).toBeNull();
  await act(async()=>vi.advanceTimersByTime(10000));expect(screen.getByRole("heading",{name:"Incomplete result among the strips scanned"})).toBeTruthy();expect(screen.getByRole("button",{name:"Finish scanning"}).hasAttribute("disabled")).toBe(false);
});
it("ignores older scans and keeps their tokens for fresh Finish verification",async()=>{
  let a!:(r:Response)=>void,b!:(r:Response)=>void;
  vi.mocked(fetch).mockImplementation(url=>new Promise(resolve=>{if(String(url).endsWith(token(0)))a=resolve;else b=resolve;}));
  render(<MedicationDetective/>);confirm();enter(0);enter(1);await act(async()=>b(active(record(1))));await act(async()=>a(active(record(0))));
  expect(list().queryByText("Fictional strip 0")).toBeNull();expect(list().getByText("Fictional strip 1")).toBeTruthy();expect(screen.getByText("Distinct tags scanned: 2 / 5")).toBeTruthy();
});
it("reading a finished record cannot retain its identity after revocation",async()=>{
  render(<MedicationDetective/>);confirm();await scan(0);fireEvent.click(screen.getByRole("button",{name:"Finish scanning"}));await screen.findByRole("heading",{name:"One recorded match among the strips scanned"});
  vi.mocked(fetch).mockResolvedValue(new Response('{"kind":"revoked"}',{status:410}));fireEvent.click(screen.getByRole("button",{name:"Read this record"}));
  expect(await screen.findByRole("heading",{name:"Incomplete result among the strips scanned"})).toBeTruthy();expect(screen.queryByText("Fictional strip 0")).toBeNull();expect(speechSynthesis.speak).not.toHaveBeenCalled();
});
it("reading an unchanged finished record keeps the summary and retap controls",async()=>{
  vi.stubGlobal("SpeechSynthesisUtterance",class{constructor(public text:string){}});
  render(<MedicationDetective/>);confirm();await scan(0);fireEvent.click(screen.getByRole("button",{name:"Finish scanning"}));await screen.findByRole("heading",{name:"One recorded match among the strips scanned"});
  fireEvent.change(screen.getByLabelText("Reading voice"),{target:{value:"device"}});fireEvent.click(screen.getByRole("button",{name:"Read this record"}));await waitFor(()=>expect(speechSynthesis.speak).toHaveBeenCalledOnce());
  expect(screen.getByRole("heading",{name:"One recorded match among the strips scanned"})).toBeTruthy();expect(screen.getByRole("button",{name:"Scan this strip again"})).toBeTruthy();
});
it("changed timing during reading discards the summary until a new full Finish check",async()=>{
  vi.stubGlobal("SpeechSynthesisUtterance",class{constructor(public text:string){}});
  render(<MedicationDetective/>);confirm();await scan(0);fireEvent.click(screen.getByRole("button",{name:"Finish scanning"}));await screen.findByRole("heading",{name:"One recorded match among the strips scanned"});
  vi.mocked(fetch).mockImplementation(async()=>active(record(0,["MORNING"])));fireEvent.change(screen.getByLabelText("Reading voice"),{target:{value:"device"}});fireEvent.click(screen.getByRole("button",{name:"Read this record"}));
  expect(await screen.findByText("This record changed. Finish scanning again to recheck the complete collection.")).toBeTruthy();expect(screen.queryByRole("heading",{name:"One recorded match among the strips scanned"})).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Finish scanning"}));expect(await screen.findByRole("heading",{name:"No recorded match among the strips scanned"})).toBeTruthy();
});
