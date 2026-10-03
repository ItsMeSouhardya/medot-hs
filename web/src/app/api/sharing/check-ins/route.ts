import { boundedBody,privateHandler,privateJson,requireOrigin,ownerRequired,recheckOwner } from "@/lib/caregiver/http";
import { checkInSchema,SharingError } from "@/lib/caregiver/types";
import { confirmIdentification } from "@/lib/caregiver/check-ins";
export async function POST(request:Request){return privateHandler(async()=>{requireOrigin(request);const owner=await ownerRequired(request),parsed=checkInSchema.safeParse(await boundedBody(request));if(!parsed.success)throw new SharingError("INVALID_INPUT");const result=await confirmIdentification(owner.groupId,parsed.data.token,parsed.data.slot,owner);await recheckOwner(request,owner);return privateJson(result);});}
