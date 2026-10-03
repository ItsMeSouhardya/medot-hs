import { getPharmacyAccess } from "@/lib/pharmacy-auth";
import { pharmacyPageDenied } from "@/lib/pharmacy-page-access";
import { listOperatorTags } from "@/lib/operator-tags";
import SharingSetup from "@/components/pharmacy/sharing-setup";
import type { OperatorTag } from "@/lib/operator-tags";
export const dynamic="force-dynamic";
export default async function PharmacySharing(){const access=await getPharmacyAccess();if(access.kind!=="authorized")return pharmacyPageDenied(access);
  let tags:OperatorTag[]|null=null;
  try{tags=await listOperatorTags(process.env.APP_ORIGIN??"");}catch{}
  if(!tags)return <main className="operator-page"><h1>Caregiver setup unavailable</h1><p role="alert">Check the demo database and site configuration.</p></main>;
  return <main className="operator-page"><h1>Caregiver setup</h1><SharingSetup tags={tags}/></main>;
}
