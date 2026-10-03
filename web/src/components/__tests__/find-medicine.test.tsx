// @vitest-environment jsdom
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { act,cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import FindMedicine from '../finder/find-medicine';
const tokenA='abcdefghijklmnopqrstuv',tokenB='zyxwvutsrqponmlkjihgfe';
const record=(token:string,name:string,slots:string[]=['EVENING'])=>({token,medicineId:token,genericName:name,strength:'Fixture',dosageForm:'Fixture',batchNumber:'SOFTWARE',expiryMonth:'2099-12',instruction:'Demo only.',usageSlots:slots});
const active=(record:unknown)=>new Response(JSON.stringify({kind:'active',record,expiryState:'CURRENT'}));
beforeEach(()=>{vi.stubGlobal('fetch',vi.fn(async(url)=>String(url).includes('find-targets')?new Response('{"targets":[]}'):active(record(tokenA,'Fictional evening'))));vi.stubGlobal('speechSynthesis',{cancel:vi.fn(),speak:vi.fn(),getVoices:()=>[]});});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
function confirm(){fireEvent.change(screen.getByRole('combobox',{name:'Choose a target'}),{target:{value:'slot:EVENING'}});fireEvent.click(screen.getByRole('button',{name:'Confirm target'}));}
function enter(token:string){fireEvent.change(screen.getByLabelText('Canonical MEDOT URL'),{target:{value:location.origin+'/m/'+token}});fireEvent.click(screen.getByRole('button',{name:'Check this URL'}));}
it('requires confirmation before reading candidates and has no automatic speech/microphone',()=>{
  render(<FindMedicine/>);expect(screen.queryByLabelText('Canonical MEDOT URL')).toBeNull();
  fireEvent.change(screen.getByRole('combobox',{name:'Choose a target'}),{target:{value:'slot:EVENING'}});expect(screen.queryByLabelText('Canonical MEDOT URL')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Confirm target'}));expect(screen.getByLabelText('Canonical MEDOT URL')).toBeTruthy();expect(speechSynthesis.speak).not.toHaveBeenCalled();
});
it('clears earlier success immediately and ignores out-of-order candidate responses',async()=>{
  let a!:(r:Response)=>void,b!:(r:Response)=>void;
  vi.mocked(fetch).mockImplementation(async url=>String(url).includes('find-targets')?new Response('{"targets":[]}'):new Promise(resolve=>{if(String(url).endsWith(tokenA))a=resolve;else b=resolve;}));
  render(<FindMedicine/>);confirm();enter(tokenA);enter(tokenB);
  await act(async()=>b(active(record(tokenB,'Current wrong medicine',['MORNING']))));
  expect(await screen.findByText('Does not match')).toBeTruthy();expect(screen.getByText('Current wrong medicine')).toBeTruthy();
  await act(async()=>a(active(record(tokenA,'Stale matching medicine'))));expect(screen.queryByText('Stale matching medicine')).toBeNull();
  enter(tokenA);expect(screen.queryByText('Current wrong medicine')).toBeNull();
});
it('expired match warns before identity and an unavailable lookup removes that identity',async()=>{
  vi.mocked(fetch).mockImplementation(async url=>String(url).includes('find-targets')?new Response('{"targets":[]}'):active({...record(tokenA,'Expired fixture'),expiryMonth:'2000-01'}));
  render(<FindMedicine/>);confirm();enter(tokenA);await screen.findByText('Matches, but expired');
  expect(screen.getByText('Expired fixture')).toBeTruthy();
  const html=screen.getByRole('main').innerHTML;expect(html.indexOf('The labelled expiry has passed')).toBeLessThan(html.indexOf('Expired fixture'));
  vi.mocked(fetch).mockResolvedValueOnce(new Response('{"kind":"revoked"}',{status:410}));enter(tokenB);
  expect(await screen.findByText('Cannot identify this medicine')).toBeTruthy();expect(screen.queryByText('Expired fixture')).toBeNull();
});
it('missing configuration allows a deliberate reference scan without exposing the catalog',async()=>{
  render(<FindMedicine/>);fireEvent.click(screen.getByRole('button',{name:'Scan a reference medicine'}));enter(tokenA);
  await screen.findByRole('option',{name:'Fictional evening · Fixture · Fixture'});
  expect(screen.queryByLabelText('Canonical MEDOT URL')).toBeNull();expect(vi.mocked(fetch).mock.calls.some(([url])=>String(url).includes('/api/admin'))).toBe(false);
});
it('Stop clears scanned identities and pending candidates; hide resets confirmation',async()=>{
  render(<FindMedicine/>);confirm();enter(tokenA);await screen.findByText('Matches selection');
  fireEvent.click(screen.getByRole('button',{name:'Stop finder'}));expect(screen.queryByText('Fictional evening')).toBeNull();expect(screen.queryByLabelText('Canonical MEDOT URL')).toBeNull();
  confirm();fireEvent(window,new Event('pagehide'));expect(screen.queryByLabelText('Canonical MEDOT URL')).toBeNull();
});
it('an absent recognition service preserves target and confirmation buttons',()=>{
  vi.stubGlobal('SpeechRecognition',undefined);vi.stubGlobal('webkitSpeechRecognition',undefined);
  render(<FindMedicine/>);fireEvent.click(screen.getByRole('button',{name:'Listen for a target'}));expect(screen.getByText('Voice recognition is unavailable. Use the labelled buttons.')).toBeTruthy();confirm();expect(screen.getByLabelText('Canonical MEDOT URL')).toBeTruthy();
});
it('voice proposes a target and still waits for explicit confirmation',()=>{
  const instances:{onresult:((e:unknown)=>void)|null}[]=[];
  vi.stubGlobal('SpeechRecognition',class{onresult=null;onerror=null;onend=null;start(){}abort(){}constructor(){instances.push(this);}});
  render(<FindMedicine/>);expect(instances).toHaveLength(0);fireEvent.click(screen.getByRole('button',{name:'Listen for a target'}));
  act(()=>instances[0].onresult?.({results:[{isFinal:true,length:1,0:{transcript:'Find my evening medicine'}}]}));
  expect(screen.queryByLabelText('Canonical MEDOT URL')).toBeNull();expect(screen.getByRole('combobox',{name:'Choose a target'}).getAttribute('id')).toBe('find-target');
  fireEvent.click(screen.getByRole('button',{name:'Confirm target'}));expect(screen.getByLabelText('Canonical MEDOT URL')).toBeTruthy();
});
it('guidance speaks a fresh candidate and fixed verdict only after an explicit start',async()=>{
  vi.stubGlobal('SpeechSynthesisUtterance',class{constructor(public text:string){}});
  render(<FindMedicine/>);confirm();fireEvent.change(screen.getByLabelText('Reading voice'),{target:{value:'device'}});
  fireEvent.click(screen.getByRole('button',{name:'Start voice guidance'}));expect(speechSynthesis.speak).not.toHaveBeenCalled();
  enter(tokenA);await waitFor(()=>expect(speechSynthesis.speak).toHaveBeenCalledOnce());
  expect(vi.mocked(speechSynthesis.speak).mock.calls[0][0].text).toContain('Fictional evening');
  expect(vi.mocked(speechSynthesis.speak).mock.calls[0][0].text).toContain('matches your confirmed selection');
});
