import { hasSameOrigin } from "../request-origin";
import { getOwnerAccess } from "./owner-session";
import { SharingError, type OwnerAccess } from "./types";
export const privateHeaders={"Cache-Control":"private, no-store, max-age=0","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"};
export const privateJson=(value:unknown,status=200,extra:Record<string,string>={})=>Response.json(value,{status,headers:{...privateHeaders,...extra}});
export async function privateHandler(action:()=>Promise<Response>){try{return await action();}catch(error){
  const code=error instanceof SharingError?error.code:"UNAVAILABLE";
  return privateJson({error:code},code==="INVALID_INPUT"?400:code==="CONFLICT"?409:code==="RATE_LIMIT"?429:code==="DENIED"?403:503);
}}
export function requireOrigin(request:Request){if(!hasSameOrigin(request))throw new SharingError("DENIED");}
export async function boundedBody(request:Request){
  if(!request.headers.get("content-type")?.startsWith("application/json"))throw new SharingError("INVALID_INPUT");
  const reader=request.body?.getReader();if(!reader)throw new SharingError("INVALID_INPUT");let bytes=0,text="";
  const decoder=new TextDecoder();try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.length;if(bytes>4096){await reader.cancel();throw new SharingError("INVALID_INPUT");}text+=decoder.decode(chunk.value,{stream:true});}
    return JSON.parse(text+decoder.decode()) as unknown;
  }catch{throw new SharingError("INVALID_INPUT");}finally{reader.releaseLock();}
}
export async function ownerRequired(request:Request):Promise<OwnerAccess>{const owner=await getOwnerAccess(request);if(owner.kind!=="owner")throw new SharingError("DENIED");return owner;}
export async function recheckOwner(request:Request,owner:OwnerAccess){const fresh=await ownerRequired(request);if(fresh.consentVersion!==owner.consentVersion||fresh.sessionId!==owner.sessionId||fresh.managementOnly!==owner.managementOnly)throw new SharingError("DENIED");}
