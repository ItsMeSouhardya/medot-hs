import { expect, it, vi, afterEach } from "vitest";
import { matchCandidate } from "../finder/match";
import { getDemoFindTargets } from "../finder/demo-targets";
import { parseFindSelection } from "../voice/commands";
import type { PublicRecord } from "../tag-repository";
const token='abcdefghijklmnopqrstuv';
const record:PublicRecord={token,medicineId:'fictional-500',genericName:'Same name',strength:'500 mg',dosageForm:'Fixture',batchNumber:'SOFTWARE',expiryMonth:'2099-12',instruction:'Software only.',usageSlots:['EVENING','NIGHT']};
afterEach(()=>vi.unstubAllEnvs());
it('compares medicine ID rather than similar names or strengths',()=>{
  expect(matchCandidate({kind:'medicine',medicineId:'fictional-500'},record)).toBe('MATCH');
  expect(matchCandidate({kind:'medicine',medicineId:'fictional-250'},record)).toBe('NO_MATCH');
  expect(matchCandidate({kind:'medicine',medicineId:'fictional-500'},{...record,medicineId:undefined})).toBe('NO_MATCH');
});
it('uses only explicit slots and distinguishes unknown timing',()=>{
  expect(matchCandidate({kind:'slot',slot:'EVENING'},record)).toBe('MATCH');
  expect(matchCandidate({kind:'slot',slot:'MORNING'},record)).toBe('NO_MATCH');
  expect(matchCandidate({kind:'slot',slot:'AS_NEEDED'},{...record,usageSlots:['AS_NEEDED']})).toBe('MATCH');
  for(const slots of [[],undefined]) expect(matchCandidate({kind:'slot',slot:'EVENING'},{...record,usageSlots:slots})).toBe('TIMING_UNKNOWN');
});
it('warns on a matching expiry at the Kolkata month-end boundary',()=>{
  const old={...record,expiryMonth:'2026-10'}, target={kind:'slot',slot:'EVENING'} as const;
  expect(matchCandidate(target,old,new Date('2026-10-31T18:29:59Z'))).toBe('MATCH');
  expect(matchCandidate(target,old,new Date('2026-10-31T18:30:00Z'))).toBe('MATCH_EXPIRED');
  expect(matchCandidate({kind:'slot',slot:'MORNING'},old,new Date('2026-11-01'))).toBe('NO_MATCH');
});
it('public demo targets require explicit bounded configuration and active verified fictional records',async()=>{
  const lookup=vi.fn(async()=>({kind:'active' as const,record:{...record,recordKind:'FICTIONAL_DEMO' as const,verifiedAt:'2026-10-02T10:00:00Z',verificationVersion:1}}));
  expect(await getDemoFindTargets('',lookup)).toEqual([]);expect(lookup).not.toHaveBeenCalled();
  expect(await getDemoFindTargets('invalid',lookup)).toEqual([]);expect(lookup).not.toHaveBeenCalled();
  expect(await getDemoFindTargets(Array.from({length:6},(_,i)=>token.slice(0,21)+i).join(','),lookup)).toEqual([]);
  expect(await getDemoFindTargets(token+','+token,lookup)).toEqual([{medicineId:record.medicineId,genericName:record.genericName,strength:record.strength,dosageForm:record.dosageForm}]);
  for(const changed of [{recordKind:'PHYSICAL_PACK'},{recordKind:'LEGACY'},{verificationVersion:undefined},{verifiedAt:undefined},{verifiedAt:'not-a-date'},{token:'zyxwvutsrqponmlkjihgfe'}]) {
    lookup.mockResolvedValueOnce({kind:'active',record:{...record,recordKind:'FICTIONAL_DEMO',verifiedAt:'2026-10-02T10:00:00Z',verificationVersion:1,...changed}} as never);
    expect(await getDemoFindTargets(token,lookup)).toEqual([]);
  }
  lookup.mockResolvedValueOnce({kind:'revoked'} as never);expect(await getDemoFindTargets(token,lookup)).toEqual([]);
  lookup.mockRejectedValueOnce(new Error('private'));expect(await getDemoFindTargets(token,lookup)).toEqual([]);
});
it('voice proposes only finite timings or displayed identities and distinguishes ambiguity',()=>{
  const options=[{medicineId:'a',genericName:'Fictional sample',strength:'500 mg',dosageForm:'Tablet'},{medicineId:'b',genericName:'Fictional sample',strength:'250 mg',dosageForm:'Tablet'}];
  expect(parseFindSelection('Find my evening medicine.','en',options)).toEqual({kind:'target',target:{kind:'slot',slot:'EVENING'}});
  expect(parseFindSelection('Which one is my evening medicine?','en',options)).toEqual({kind:'target',target:{kind:'slot',slot:'EVENING'}});
  expect(parseFindSelection('সন্ধ্যা','bn',options)).toEqual({kind:'target',target:{kind:'slot',slot:'EVENING'}});
  expect(parseFindSelection('शाम','hi',options)).toEqual({kind:'target',target:{kind:'slot',slot:'EVENING'}});
  expect(parseFindSelection('Fictional sample','en',options)).toEqual({kind:'ambiguous'});
  expect(parseFindSelection('Fictional sample 500 mg Tablet','en',options)).toEqual({kind:'target',target:{kind:'medicine',medicineId:'a'}});
  for(const value of ['unlisted medicine','evening and morning','do not find my evening medicine','take this now','x'.repeat(201)]) expect(parseFindSelection(value,'en',options)).toEqual({kind:'unknown'});
});
