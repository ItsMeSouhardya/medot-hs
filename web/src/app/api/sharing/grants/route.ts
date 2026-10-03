import { z } from "zod";
import { boundedBody,privateHandler,privateJson,requireOrigin,ownerRequired,recheckOwner } from "@/lib/caregiver/http";
import { revokeCaregiverGrant } from "@/lib/caregiver/repository";
import { SharingError } from "@/lib/caregiver/types";
export async function DELETE(request:Request){return privateHandler(async()=>{requireOrigin(request);const owner=await ownerRequired(request),parsed=z.object({id:z.string().uuid()}).strict().safeParse(await boundedBody(request));if(!parsed.success)throw new SharingError("INVALID_INPUT");if(!await revokeCaregiverGrant(owner,parsed.data.id))throw new SharingError("DENIED");await recheckOwner(request,owner);return privateJson({ok:true});});}
