import { createHash,randomBytes } from "node:crypto";
export const newCredential=()=>randomBytes(32).toString("base64url");
export const hashCredential=(value:string)=>createHash("sha256").update(value).digest("hex");
