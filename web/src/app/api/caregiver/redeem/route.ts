import { boundedBody,privateHandler,privateJson,requireOrigin } from "@/lib/caregiver/http";
import { codeSchema,SharingError } from "@/lib/caregiver/types";
import { redeemCaregiverInvite } from "@/lib/caregiver/consent";
import { caregiverUser } from "@/lib/caregiver/clerk-user";
export async function POST(request:Request){return privateHandler(async()=>{requireOrigin(request);const user=await caregiverUser();if(!user)return privateJson({error:"UNAUTHENTICATED"},401);const parsed=codeSchema.safeParse(await boundedBody(request));if(!parsed.success)throw new SharingError("INVALID_INPUT");return privateJson(await redeemCaregiverInvite(parsed.data.code,user));});}
