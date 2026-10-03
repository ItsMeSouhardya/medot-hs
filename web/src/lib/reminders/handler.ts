import { privateJson,privateHandler,requireOrigin,boundedBody } from "../caregiver/http";
import { SharingError } from "../caregiver/types";
import { deviceHash,deviceSecret,newDeviceSecret,hashSecret,reminderCookie,registrationBucket,cronAuthorized } from "./security";
import { reminderSchema,subscribeSchema,removeSchema } from "./domain";
import * as repo from "./repository";
import { pushConfiguration,sendPush } from "./push";
import { dispatchReminders } from "./dispatch";

async function requiredDevice(request:Request){
  const hash=deviceHash(request);if(!hash||!await repo.deviceState(hash))throw new SharingError("DENIED");return hash;
}
export function remindersGet(request:Request){return privateHandler(async()=>{
  const config=pushConfiguration(),hash=deviceHash(request),device=hash?await repo.deviceState(hash):null;
  return privateJson({configured:!!config,enabled:device?.enabled??false,expiresAt:device?.expiresAt??null,reminders:device&&hash?await repo.listReminders(hash):[],publicKey:config?.publicKey??null});
});}
export function remindersPost(request:Request){return privateHandler(async()=>{
  requireOrigin(request);const hash=await requiredDevice(request);
  const input=reminderSchema.safeParse(await boundedBody(request));if(!input.success)throw new SharingError("INVALID_INPUT");
  await repo.saveReminder(hash,input.data);return privateJson({ok:true});
});}
export function remindersDelete(request:Request){return privateHandler(async()=>{
  requireOrigin(request);const hash=await requiredDevice(request);
  const input=removeSchema.safeParse(await boundedBody(request));if(!input.success)throw new SharingError("INVALID_INPUT");
  await repo.deleteReminder(hash,input.data.id);return privateJson({ok:true});
});}
export function subscriptionPost(request:Request){return privateHandler(async()=>{
  requireOrigin(request);if(!pushConfiguration())throw new SharingError("UNAVAILABLE");
  const input=subscribeSchema.safeParse(await boundedBody(request));if(!input.success)throw new SharingError("INVALID_INPUT");
  if(!await repo.reserveRegistration(registrationBucket(request)))throw new SharingError("RATE_LIMIT");
  const existing=deviceHash(request),valid=existing&&await repo.deviceState(existing),secret=valid?deviceSecret(request)!:newDeviceSecret(),hash=hashSecret(secret);
  // Validate the cookie before persisting consent; return it only on successful storage.
  const cookie=reminderCookie(secret);
  await repo.subscribeDevice(hash,input.data.subscription);
  return privateJson({ok:true},200,{"Set-Cookie":cookie});
});}
export function subscriptionPause(request:Request){return privateHandler(async()=>{
  requireOrigin(request);await repo.pauseDevice(await requiredDevice(request));return privateJson({ok:true});
});}
export function subscriptionDelete(request:Request){return privateHandler(async()=>{
  requireOrigin(request);const hash=deviceHash(request);if(hash)await repo.deleteDevice(hash);
  return privateJson({ok:true},200,{"Set-Cookie":reminderCookie("",0)});
});}
export function remindersCron(request:Request){return privateHandler(async()=>{
  if(!cronAuthorized(request))throw new SharingError("DENIED");if(!pushConfiguration())throw new SharingError("UNAVAILABLE");
  await repo.cleanupReminders();
  const counts=await dispatchReminders({claim:repo.claimDue,current:repo.currentSubscription,send:sendPush,removeDevice:repo.removeGoneDevice,now:()=>new Date()});
  return privateJson(counts,counts.failed>0?503:200);
});}
