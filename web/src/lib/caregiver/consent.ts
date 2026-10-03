import { consentSchema, setupSchema, inviteSchema, secretSchema, groupPattern, SharingError, type OwnerAccess } from "./types";
import { newCredential, hashCredential } from "./credentials";
import { atomicConsent, insertSharingGroup, insertCaregiverInvite, claimCaregiverInvite, rotateOwnerCredential } from "./repository";
export async function saveConsent(raw:unknown,owner:OwnerAccess):Promise<{version:number}>{
  const parsed=consentSchema.safeParse(raw);if(!parsed.success)throw new SharingError("INVALID_INPUT");
  if(parsed.data.expectedVersion!==owner.consentVersion)throw new SharingError("CONFLICT");
  const result=await atomicConsent(owner,parsed.data);if(!result)throw new SharingError("CONFLICT");return result;
}
export async function disableSharing(groupId:string,owner:OwnerAccess){
  if(groupId!==owner.groupId)throw new SharingError("DENIED");
  return saveConsent({enabled:false,scopes:{status:false,details:false},selectedTokens:[],expectedVersion:owner.consentVersion},owner);
}
export async function createSharingGroup(raw:unknown,actor:string):Promise<{groupId:string;ownerCode:string}>{
  const parsed=setupSchema.safeParse(raw);if(!parsed.success)throw new SharingError("INVALID_INPUT");if(!actor)throw new SharingError("DENIED");
  const ownerCode=newCredential(),groupId=await insertSharingGroup(actor,parsed.data.selectedTokens,hashCredential(ownerCode));
  if(!groupId)throw new SharingError("CONFLICT");return {groupId,ownerCode};
}
export async function rotateOwnerCode(groupId:string,actor:string){
  if(!groupPattern.test(groupId)||!actor)throw new SharingError("DENIED");const ownerCode=newCredential();
  if(!await rotateOwnerCredential(groupId,actor,hashCredential(ownerCode)))throw new SharingError("DENIED");return {ownerCode};
}
export async function createCaregiverInvite(raw:unknown,owner:OwnerAccess):Promise<{code:string}>{
  if(owner.managementOnly)throw new SharingError("DENIED");const parsed=inviteSchema.safeParse(raw);
  if(!parsed.success)throw new SharingError("INVALID_INPUT");const code=newCredential();
  if(!await insertCaregiverInvite(owner,parsed.data.scopes,hashCredential(code)))throw new SharingError("DENIED");return {code};
}
export async function redeemCaregiverInvite(code:string,userId:string):Promise<{groupId:string}>{
  if(!secretSchema.safeParse(code).success)throw new SharingError("INVALID_INPUT");if(!userId||userId.length>200)throw new SharingError("DENIED");
  const groupId=await claimCaregiverInvite(hashCredential(code),userId);if(!groupId)throw new SharingError("DENIED");return {groupId};
}
