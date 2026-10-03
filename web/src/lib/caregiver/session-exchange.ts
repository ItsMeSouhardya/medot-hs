import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { codeSchema, SharingError } from "./types";
import { newCredential, hashCredential } from "./credentials";
import { reserveOwnerAttempt, insertOwnerSession } from "./repository";
import { OWNER_COOKIE } from "./owner-session";
export function ownerCookie(secret:string,maxAge=43200){
  const origin=new URL(process.env.APP_ORIGIN??"");
  const local=process.env.NODE_ENV!=="production"&&origin.protocol==="http:"&&["localhost","127.0.0.1"].includes(origin.hostname);
  if(!local&&origin.protocol!=="https:")throw new SharingError("UNAVAILABLE");
  return `${OWNER_COOKIE}=${secret}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${local?"":"; Secure"}`;
}
export async function exchangeOwnerCode(raw:unknown,request:Request){
  const key=process.env.SHARING_RATE_LIMIT_SECRET;
  if(!key||key.length<32)throw new SharingError("UNAVAILABLE");
  // Render must overwrite X-Forwarded-For. Only its last hop is accepted;
  // malformed/missing addresses share a fail-closed bucket. No raw IP is stored.
  const forwarded=request.headers.get("x-forwarded-for")??"";
  const last=forwarded.length<=1024?forwarded.split(",").at(-1)?.trim():"";
  const bucket=createHmac("sha256",key).update(last&&isIP(last)?last:"unknown").digest("hex");
  if(!await reserveOwnerAttempt(bucket))throw new SharingError("RATE_LIMIT");
  const parsed=codeSchema.safeParse(raw);if(!parsed.success)throw new SharingError("INVALID_INPUT");
  const credential=newCredential();
  if(!await insertOwnerSession(hashCredential(parsed.data.code),hashCredential(credential)))throw new SharingError("DENIED");
  return ownerCookie(credential);
}
