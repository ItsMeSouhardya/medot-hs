import webPush from "web-push";
import { createECDH } from "node:crypto";
import type { Subscription,notificationPayload } from "./domain";
export function pushConfiguration(){
  const publicKey=process.env.VAPID_PUBLIC_KEY,privateKey=process.env.VAPID_PRIVATE_KEY,subject=process.env.VAPID_SUBJECT;
  if(!publicKey||!privateKey||!subject||!/^https:\/\//.test(subject))return null;
  try {
    const origin=new URL(process.env.APP_ORIGIN??""),contact=new URL(subject);
    if(origin.protocol!=="https:"&&!(process.env.NODE_ENV!=="production"&&origin.protocol==="http:"&&["localhost","127.0.0.1"].includes(origin.hostname)))return null;
    if(contact.username||contact.password)return null;
    if(!/^[A-Za-z0-9_-]+$/.test(publicKey)||Buffer.from(publicKey,"base64url").length!==65||Buffer.from(publicKey,"base64url")[0]!==4||!/^[A-Za-z0-9_-]+$/.test(privateKey)||Buffer.from(privateKey,"base64url").length!==32)return null;
    const curve=createECDH("prime256v1");curve.setPrivateKey(Buffer.from(privateKey,"base64url"));
    if(curve.getPublicKey().toString("base64url")!==publicKey)return null;
    if(!process.env.REMINDER_CRON_SECRET||process.env.REMINDER_CRON_SECRET.length<32||!process.env.SHARING_RATE_LIMIT_SECRET||process.env.SHARING_RATE_LIMIT_SECRET.length<32)return null;
    return {subject,publicKey,privateKey};
  } catch { return null; }
}
export async function sendPush(subscription:Subscription,payload:ReturnType<typeof notificationPayload>){
  const vapidDetails=pushConfiguration();if(!vapidDetails)throw new Error("Push unavailable");
  return webPush.sendNotification(subscription,JSON.stringify(payload),{vapidDetails,TTL:300,urgency:"normal",timeout:8000});
}
