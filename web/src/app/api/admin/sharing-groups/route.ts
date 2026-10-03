import { getPharmacyAccess } from "@/lib/pharmacy-auth";
import { boundedBody,privateHandler,privateJson,requireOrigin } from "@/lib/caregiver/http";
import { createSharingGroup } from "@/lib/caregiver/consent";
import { listSharingGroups } from "@/lib/caregiver/repository";
export const dynamic="force-dynamic";
export async function GET(){return privateHandler(async()=>{const access=await getPharmacyAccess();if(access.kind!=="authorized")return privateJson({error:"DENIED"},access.kind==="forbidden"?403:401);return privateJson(await listSharingGroups(access.userId));});}
export async function POST(request:Request){return privateHandler(async()=>{const access=await getPharmacyAccess();if(access.kind!=="authorized")return privateJson({error:"DENIED"},access.kind==="forbidden"?403:401);requireOrigin(request);return privateJson(await createSharingGroup(await boundedBody(request),access.userId),201);});}
