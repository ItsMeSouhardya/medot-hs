import Reminders from "@/components/reminders/reminders";
import { normalizeLanguage } from "@/lib/i18n";
export default async function RemindersPage({searchParams}:{searchParams:Promise<{lang?:string;medicine?:string}>}){
  const params=await searchParams;
  return <Reminders initialLanguage={normalizeLanguage(params.lang)} initialToken={/^[A-Za-z0-9_-]{22}$/.test(params.medicine??"")?params.medicine:""}/>;
}
