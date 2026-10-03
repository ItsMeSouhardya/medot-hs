import { auth } from "@clerk/nextjs/server";
import { isPharmacyAuthConfigured } from "../pharmacy-auth";
export async function caregiverUser():Promise<string|null>{
  if(!isPharmacyAuthConfigured())return null;
  try{return (await auth()).userId??null;}catch{return null;}
}
