import { createHash,createHmac,randomBytes,timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
export const REMINDER_COOKIE="medot_reminders";
export const hashSecret=(secret:string)=>createHash("sha256").update(secret).digest("hex");
export const newDeviceSecret=()=>randomBytes(32).toString("base64url");
export function deviceSecret(request:Request):string|null {
  const cookies=(request.headers.get("cookie")??"").split(";").map(value=>value.trim()).filter(value=>value.startsWith(REMINDER_COOKIE+"="));
  if(cookies.length!==1)return null;
  const value=cookies[0].slice(REMINDER_COOKIE.length+1);
  return /^[A-Za-z0-9_-]{43}$/.test(value)?value:null;
}
export function deviceHash(request:Request):string|null {const secret=deviceSecret(request);return secret?hashSecret(secret):null;}
export function reminderCookie(secret:string,maxAge=90*86400){
  const origin=new URL(process.env.APP_ORIGIN??"");
  const local=process.env.NODE_ENV!=="production"&&origin.protocol==="http:"&&["localhost","127.0.0.1"].includes(origin.hostname);
  if(!local&&origin.protocol!=="https:")throw new Error("Reminder origin unavailable");
  return `${REMINDER_COOKIE}=${secret}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${local?"":"; Secure"}`;
}
export function registrationBucket(request:Request):string {
  const salt=process.env.SHARING_RATE_LIMIT_SECRET;
  if(!salt||salt.length<32)throw new Error("Reminder throttle unavailable");
  const header=request.headers.get("x-forwarded-for")??"",last=header.length<=1024?header.split(",").at(-1)?.trim():"";
  return createHmac("sha256",salt).update("reminders:"+(last&&isIP(last)?last:"unknown")).digest("hex");
}
export function cronAuthorized(request:Request,secret=process.env.REMINDER_CRON_SECRET){
  if(!secret||secret.length<32)return false;
  const expected=Buffer.from(`Bearer ${secret}`),actual=Buffer.from(request.headers.get("authorization")??"");
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
