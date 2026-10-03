import { z } from "zod";
import type { Language } from "../i18n";

export const timePattern=/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/;
export function pushEndpoint(endpoint:string):boolean {
  try {
    const url=new URL(endpoint);
    return url.protocol==="https:"&&!url.username&&!url.password&&!url.port&&!url.hash&&
      (["fcm.googleapis.com","updates.push.services.mozilla.com","web.push.apple.com"].includes(url.hostname)||/^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname));
  } catch { return false; }
}
const base64Key=(length:number)=>z.string().regex(/^[A-Za-z0-9_-]+$/).refine(value=>Buffer.from(value,"base64url").length===length&&Buffer.from(value,"base64url").toString("base64url")===value);
export const subscriptionSchema=z.object({endpoint:z.string().max(2048).refine(pushEndpoint),expirationTime:z.number().nullable().optional(),keys:z.object({p256dh:base64Key(65).refine(value=>Buffer.from(value,"base64url")[0]===4),auth:base64Key(16)}).strict()}).strict();
export const subscribeSchema=z.object({subscription:subscriptionSchema,consent:z.literal(true)}).strict();
export const reminderSchema=z.object({token:z.string().regex(/^[A-Za-z0-9_-]{22}$/),time:z.string().regex(timePattern),language:z.enum(["en","bn","hi"]),enabled:z.boolean()}).strict();
export const removeSchema=z.object({id:z.string().uuid()}).strict();
export type Subscription=z.infer<typeof subscriptionSchema>;
export type ReminderInput=z.infer<typeof reminderSchema>;
export type Reminder={id:string;token:string;time:string;language:Language;enabled:boolean;nextDue:string;available:boolean};
export type ReminderState={configured:boolean;enabled:boolean;expiresAt:string|null;reminders:Reminder[]};
export function nextReminder(time:string,now:Date):Date {
  if(!timePattern.test(time)||!Number.isFinite(now.getTime()))throw new Error("Invalid reminder time");
  const offset=330*60000,day=86400000;
  const midnight=Math.floor((now.getTime()+offset)/day)*day-offset;
  const [hours,minutes]=time.split(":").map(Number);
  let due=midnight+(hours*60+minutes)*60000;
  if(due<=now.getTime())due+=day;
  return new Date(due);
}
export function notificationPayload(language:Language){
  const messages={en:["MEDOT reminder","It is time for your chosen reminder. Open MEDOT to review your recorded medicine information."],bn:["MEDOT মনে করিয়ে দিচ্ছে","আপনার নির্ধারিত মনে করানোর সময় হয়েছে। ওষুধের সংরক্ষিত তথ্য দেখতে MEDOT খুলুন।"],hi:["MEDOT अनुस्मारक","आपके चुने हुए अनुस्मारक का समय हो गया है। दवा की दर्ज जानकारी देखने के लिए MEDOT खोलें।"]};
  const [title,body]=messages[language];return {title,body,url:"/reminders",language};
}
