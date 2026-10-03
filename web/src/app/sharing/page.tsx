import SharingControls from "@/components/caregiver/sharing-controls";
import { normalizeLanguage } from "@/lib/i18n";
export default async function SharingPage({searchParams}:{searchParams:Promise<{lang?:string}>}){return <SharingControls initialLanguage={normalizeLanguage((await searchParams).lang)}/>;}
