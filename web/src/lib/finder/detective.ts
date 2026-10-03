import type { PublicRecord } from "../tag-repository";
import type { UsageSlot } from "../usage-slots";
import { expiryState } from "../expiry";
export type DetectiveSummary={kind:"NONE"|"ONE"|"MULTIPLE";matches:PublicRecord[];expiredTokens:string[];unclassifiedTokens:string[]};
export function collectCandidate(records:PublicRecord[],candidate:PublicRecord):PublicRecord[]{
  const unique=new Map(records.map(record=>[record.token,record]));
  if(!unique.has(candidate.token)&&unique.size>=5)throw new Error("candidate-limit");
  unique.set(candidate.token,candidate);return [...unique.values()];
}
export function summarizeCandidates(records:PublicRecord[],slot:UsageSlot,now?:Date):DetectiveSummary{
  const unique=[...new Map(records.map(record=>[record.token,record])).values()];
  const matches=unique.filter(record=>record.usageSlots?.includes(slot));
  return {kind:matches.length===0?"NONE":matches.length===1?"ONE":"MULTIPLE",matches,
    expiredTokens:matches.filter(record=>expiryState(record.expiryMonth,now)==="EXPIRED").map(record=>record.token),
    unclassifiedTokens:unique.filter(record=>!record.usageSlots?.length).map(record=>record.token)};
}
