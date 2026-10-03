import { groupPattern,type Denied } from "./types";
import { lookupCaregiverGrant } from "./repository";
export async function getCaregiverAccess(userId:string,groupId:string,scope:"status"|"details",now?:Date):Promise<{kind:"granted";consentVersion:number;details:boolean}|Denied>{
  if(!userId||userId.length>200||!groupPattern.test(groupId))return {kind:"denied"};
  const row=await lookupCaregiverGrant(userId,groupId);
  const checkedAt=now??new Date();
  if(!row||row.groupId!==groupId||row.userId!==userId||!row.enabled||row.revoked||row.grantVersion!==row.consentVersion||!row.expiresAt||!(new Date(row.expiresAt).getTime()>checkedAt.getTime())||!row.status||!row.grantStatus)return {kind:"denied"};
  const details=row.details&&row.grantDetails;if(scope==="details"&&!details)return {kind:"denied"};
  return {kind:"granted",consentVersion:row.consentVersion,details};
}
