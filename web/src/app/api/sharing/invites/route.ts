import { boundedBody,privateHandler,privateJson,requireOrigin,ownerRequired,recheckOwner } from "@/lib/caregiver/http";
import { createCaregiverInvite } from "@/lib/caregiver/consent";
export async function POST(request:Request){return privateHandler(async()=>{requireOrigin(request);const owner=await ownerRequired(request),result=await createCaregiverInvite(await boundedBody(request),owner);await recheckOwner(request,owner);return privateJson(result,201);});}
