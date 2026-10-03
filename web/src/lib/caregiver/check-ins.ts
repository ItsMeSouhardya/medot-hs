import { checkInSchema, SharingError, type OwnerAccess } from "./types";
import type { UsageSlot } from "../usage-slots";
import { atomicCheckIn } from "./repository";
export async function confirmIdentification(groupId:string,token:string,slot:UsageSlot|"UNCLASSIFIED",owner:OwnerAccess):Promise<{day:string;outcome:"CURRENT_LABEL"|"EXPIRED_LABEL"}>{
  if(owner.managementOnly||groupId!==owner.groupId||!checkInSchema.safeParse({token,slot}).success)throw new SharingError("DENIED");
  const result=await atomicCheckIn(owner,token,slot);if(!result)throw new SharingError("DENIED");return result;
}
