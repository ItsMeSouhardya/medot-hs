import { getPharmacyAccess } from "@/lib/pharmacy-auth";
import { boundedBody,privateHandler,privateJson,requireOrigin } from "@/lib/caregiver/http";
import { rotateOwnerCode } from "@/lib/caregiver/consent";
import { SharingError } from "@/lib/caregiver/types";
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return privateHandler(async()=>{const access=await getPharmacyAccess();if(access.kind!=="authorized")return privateJson({error:"DENIED"},access.kind==="forbidden"?403:401);requireOrigin(request);const body=await boundedBody(request);if(!body||typeof body!=="object"||Object.keys(body).length!==1||!("patientAgreed" in body)||body.patientAgreed!==true)throw new SharingError("INVALID_INPUT");return privateJson(await rotateOwnerCode((await context.params).id,access.userId));});}
