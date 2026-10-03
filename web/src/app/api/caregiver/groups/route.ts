import { privateHandler,privateJson } from "@/lib/caregiver/http";
import { caregiverUser } from "@/lib/caregiver/clerk-user";
import { caregiverGroups } from "@/lib/caregiver/repository";
import { getCaregiverStatus } from "@/lib/caregiver/status";
import { getCaregiverAccess } from "@/lib/caregiver/access";
import { SharingError } from "@/lib/caregiver/types";
export const dynamic="force-dynamic";
export async function GET(){return privateHandler(async()=>{const user=await caregiverUser();if(!user)return privateJson({error:"UNAUTHENTICATED"},401);
  const groups=await caregiverGroups(user),result=[];
  for(const group of groups){const access=await getCaregiverAccess(user,group.id,"status");if(access.kind!=="granted")throw new SharingError("DENIED");
    result.push({id:group.id,statuses:await getCaregiverStatus(user,group.id),version:access.consentVersion,details:access.details});}
  for(const group of result){const fresh=await getCaregiverAccess(user,group.id,"status");if(fresh.kind!=="granted"||fresh.consentVersion!==group.version||fresh.details!==group.details)throw new SharingError("DENIED");}
  return privateJson(result.map(({id,statuses})=>({id,statuses})));
});}
