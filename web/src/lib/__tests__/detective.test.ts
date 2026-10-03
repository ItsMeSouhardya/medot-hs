import { expect, it } from "vitest";
import { collectCandidate, summarizeCandidates } from "../finder/detective";
import type { PublicRecord } from "../tag-repository";
const record = (index:number, slots:PublicRecord["usageSlots"]=["MORNING"]):PublicRecord => ({token:`abcdefghijklmnopqrstu${index}`,medicineId:`fixture-${index}`,genericName:"Fictional strip",strength:`Fixture ${index}`,dosageForm:"Fixture",batchNumber:"SOFTWARE",expiryMonth:"2099-12",instruction:"Software demo only.",usageSlots:slots});
it("collects five distinct strips, updates repeated tokens in place and rejects a sixth",()=>{
  const five=Array.from({length:5},(_,i)=>record(i));
  const changed={...five[1],usageSlots:["EVENING"] as const};
  expect(collectCandidate(five,{...changed,usageSlots:[...changed.usageSlots]})).toEqual([five[0],changed,five[2],five[3],five[4]]);
  expect(()=>collectCandidate(five,record(5))).toThrow("candidate-limit");
  expect(five[1].usageSlots).toEqual(["MORNING"]);
});
it("summarizes one, multiple and no recorded matches without choosing by order",()=>{
  const five=[record(0),record(1,["AFTERNOON"]),record(2,["EVENING"]),record(3),record(4,["AS_NEEDED"])];
  expect(summarizeCandidates(five,"EVENING")).toMatchObject({kind:"ONE",matches:[five[2]],expiredTokens:[],unclassifiedTokens:[]});
  const two=[...five,record(5,["EVENING","NIGHT"])];
  expect(summarizeCandidates(two,"EVENING")).toMatchObject({kind:"MULTIPLE",matches:[five[2],two[5]]});
  expect(summarizeCandidates(five,"NIGHT")).toMatchObject({kind:"NONE",matches:[]});
  expect(summarizeCandidates(five,"AS_NEEDED").matches).toEqual([five[4]]);
});
it("keeps empty or missing timing unclassified and never interprets instructions",()=>{
  const list=[record(0,[]),{...record(1),usageSlots:undefined,instruction:"Evening fixture text, not a timing classification."},record(2,["EVENING","MORNING"])];
  expect(summarizeCandidates(list,"EVENING")).toMatchObject({kind:"ONE",matches:[list[2]],unclassifiedTokens:[list[0].token,list[1].token]});
});
it("counts repeated tokens once and uses their last current record",()=>{
  const first=record(0,["EVENING"]),last=record(0,["MORNING"]);
  expect(summarizeCandidates([first,first],"EVENING").kind).toBe("ONE");
  expect(summarizeCandidates([first,last],"EVENING").kind).toBe("NONE");
});
it("identifies expired matches at the Kolkata month-end boundary",()=>{
  const r={...record(0,["EVENING"]),expiryMonth:"2026-10"};
  expect(summarizeCandidates([r],"EVENING",new Date("2026-10-31T18:29:59Z")).expiredTokens).toEqual([]);
  expect(summarizeCandidates([r],"EVENING",new Date("2026-10-31T18:30:00Z")).expiredTokens).toEqual([r.token]);
  expect(summarizeCandidates([r],"MORNING",new Date("2026-11-01")).expiredTokens).toEqual([]);
});
