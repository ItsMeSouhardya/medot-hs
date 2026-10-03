import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { caregiverUser } from "@/lib/caregiver/clerk-user";
import CaregiverDashboard from "@/components/caregiver/dashboard";
export const dynamic="force-dynamic";
export default async function CaregiverPage(){if(!await caregiverUser())redirect("/caregiver/sign-in");return <><div className="caregiver-account"><UserButton/></div><CaregiverDashboard/></>;}
