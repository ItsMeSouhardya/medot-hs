import { boundedBody,privateHandler,privateJson,requireOrigin,ownerRequired,recheckOwner } from "@/lib/caregiver/http";
import { ownerControls } from "@/lib/caregiver/repository";
import { saveConsent } from "@/lib/caregiver/consent";
import { SharingError } from "@/lib/caregiver/types";
export const dynamic="force-dynamic";
export async function GET(request:Request){return privateHandler(async()=>{const owner=await ownerRequired(request),controls=await ownerControls(owner);if(!controls)throw new SharingError("DENIED");await recheckOwner(request,owner);return privateJson(controls);});}
export async function POST(request:Request){return privateHandler(async()=>{requireOrigin(request);const owner=await ownerRequired(request);await saveConsent(await boundedBody(request),owner);const fresh=await ownerRequired(request),controls=await ownerControls(fresh);if(!controls)throw new SharingError("DENIED");await recheckOwner(request,fresh);return privateJson(controls);});}
