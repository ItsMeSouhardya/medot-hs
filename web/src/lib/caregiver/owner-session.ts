import { secretPattern,type OwnerAccess,type Denied } from "./types";
import { hashCredential } from "./credentials";
import { lookupOwnerSession } from "./repository";
export const OWNER_COOKIE="medot_owner";
export async function getOwnerAccess(request:Request,now?:Date):Promise<OwnerAccess|Denied>{
  const values=(request.headers.get("cookie")??"").split(";").map(value=>value.trim()).filter(value=>value.startsWith(OWNER_COOKIE+"="));
  if(values.length!==1)return {kind:"denied"};const secret=values[0].slice(OWNER_COOKIE.length+1);if(!secretPattern.test(secret))return {kind:"denied"};
  const row=await lookupOwnerSession(hashCredential(secret));
  const checkedAt=now??new Date();
  if(!row||row.sessionRevoked||!(new Date(row.sessionExpiresAt).getTime()>checkedAt.getTime())||row.sessionVersion!==row.groupVersion)return {kind:"denied"};
  return {kind:"owner",groupId:row.groupId,sessionId:row.sessionId,consentVersion:row.groupVersion,
    managementOnly:row.managementOnly||!row.enabled||!row.consentExpiresAt||!(new Date(row.consentExpiresAt).getTime()>checkedAt.getTime())};
}
