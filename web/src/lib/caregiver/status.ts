import { getCaregiverAccess } from "./access";
import { caregiverStatusRows, activeSharedTokens, type StatusRow } from "./repository";
import { SharingError, type CaregiverStatus, type SlotStatus } from "./types";
import { usageSlots } from "../usage-slots";
export function projectStatus(row:StatusRow,details:boolean,now=new Date()):CaregiverStatus{
  if(!row.available)return {alias:row.alias,available:false,pairingVerified:false,slots:[]};
  const day=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
  const slots=(row.usageSlots.length?row.usageSlots.filter((s):s is typeof usageSlots[number]=>usageSlots.includes(s as typeof usageSlots[number])):["UNCLASSIFIED" as const]);
  return {alias:row.alias,available:true,pairingVerified:row.verificationVersion===1&&!!row.verifiedAt,
    slots:slots.map(slot=>{const event=row.events.find(e=>e.slot===slot&&e.day===day&&Date.parse(e.identifiedAt)>now.getTime()-7*86400000);
      return {slot,state:event?"SHARED":slot==="AS_NEEDED"||slot==="UNCLASSIFIED"?"OPTIONAL":"NO_CHECK_IN",...(event?{outcome:event.outcome}:{})} as SlotStatus;}),
    ...(details&&row.record?{details:row.record}:{})};
}
export async function getCaregiverStatus(userId:string,groupId:string){
  const access=await getCaregiverAccess(userId,groupId,"status");if(access.kind!=="granted")throw new SharingError("DENIED");
  const rows=await caregiverStatusRows(userId,groupId,access.details);
  const active=new Set(await activeSharedTokens(userId,groupId));
  // Recheck after all queries: a consent change cannot authorize a late payload.
  const fresh=await getCaregiverAccess(userId,groupId,"status");
  if(fresh.kind!=="granted"||fresh.consentVersion!==access.consentVersion||fresh.details!==access.details)throw new SharingError("DENIED");
  const checkedAt=new Date();return rows.map(row=>projectStatus(active.has(row.internalToken)?row:{...row,available:false},fresh.details,checkedAt));
}
