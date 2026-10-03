import { privateHandler,privateJson,ownerRequired,recheckOwner } from "@/lib/caregiver/http";
import { ownerRecords } from "@/lib/caregiver/repository";
import { SharingError } from "@/lib/caregiver/types";
export const dynamic="force-dynamic";
export async function GET(request:Request){return privateHandler(async()=>{const owner=await ownerRequired(request);if(owner.managementOnly)throw new SharingError("DENIED");const records=await ownerRecords(owner);await recheckOwner(request,owner);return privateJson(records);});}
