import type { Language } from "../i18n";
import { notificationPayload,type Subscription } from "./domain";
export type DueReminder={id:string;deviceId:string;token:string;language:Language;dueAt:string};
export type DispatchDependencies={claim:()=>Promise<DueReminder[]>;current:(item:DueReminder)=>Promise<Subscription|null>;send:(subscription:Subscription,payload:ReturnType<typeof notificationPayload>)=>Promise<unknown>;removeDevice:(id:string)=>Promise<unknown>;now:()=>Date};
export async function dispatchReminders(deps:DispatchDependencies){
  const items=await deps.claim(),result={claimed:items.length,sent:0,skipped:0,failed:0};
  for(const item of items){
    try {
      const subscription=await deps.current(item);
      const delay=deps.now().getTime()-new Date(item.dueAt).getTime();
      if(!subscription||!Number.isFinite(delay)||delay<0||delay>5*60000){result.skipped++;continue;}
      await deps.send(subscription,notificationPayload(item.language));result.sent++;
    } catch(error) {
      result.failed++;
      if(error&&typeof error==="object"&&"statusCode" in error&&[404,410].includes(Number(error.statusCode)))await deps.removeDevice(item.deviceId).catch(()=>{});
    }
  }
  return result;
}
