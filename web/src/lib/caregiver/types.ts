import { z } from "zod";
import { usageSlots,type UsageSlot } from "../usage-slots";
import type { PublicRecord } from "../tag-repository";
export const secretPattern=/^[A-Za-z0-9_-]{43}$/;
export const groupPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const tokenSchema=z.string().regex(/^[A-Za-z0-9_-]{22}$/);
export const secretSchema=z.string().regex(secretPattern);
export const codeSchema=z.object({code:secretSchema}).strict();
export const consentSchema=z.object({enabled:z.boolean(),scopes:z.object({status:z.boolean(),details:z.boolean().default(false)}).strict(),selectedTokens:z.array(tokenSchema).max(5),expectedVersion:z.number().int().min(0).max(2147483646)}).strict().superRefine((value,ctx)=>{
  if(new Set(value.selectedTokens).size!==value.selectedTokens.length||value.enabled&&(!value.scopes.status||!value.selectedTokens.length)||!value.enabled&&(value.scopes.status||value.scopes.details))ctx.addIssue({code:"custom",message:"Invalid consent"});
});
export const setupSchema=z.object({selectedTokens:z.array(tokenSchema).min(1).max(5),patientAgreed:z.literal(true)}).strict().refine(value=>new Set(value.selectedTokens).size===value.selectedTokens.length);
export const inviteSchema=z.object({scopes:z.object({status:z.literal(true),details:z.boolean().default(false)}).strict()}).strict();
export const checkInSchema=z.object({token:tokenSchema,slot:z.enum([...usageSlots,"UNCLASSIFIED"])}).strict();
export type ConsentInput=z.infer<typeof consentSchema>;
export type OwnerAccess={kind:"owner";groupId:string;sessionId:string;consentVersion:number;managementOnly:boolean};
export type Denied={kind:"denied"};
export type OwnerSessionRow={groupId:string;sessionId:string;sessionVersion:number;groupVersion:number;sessionExpiresAt:string;sessionRevoked:boolean;managementOnly:boolean;enabled:boolean;consentExpiresAt:string|null};
export type CaregiverGrantRow={groupId:string;userId:string;consentVersion:number;grantVersion:number;enabled:boolean;status:boolean;details:boolean;grantStatus:boolean;grantDetails:boolean;expiresAt:string|null;revoked:boolean};
export type OwnerControls={groupId:string;enabled:boolean;version:number;scopes:{status:boolean;details:boolean};expiresAt:string|null;members:{token:string;alias:string;selected:boolean}[];grants:{id:string}[]};
export type OwnerRecord={token:string;alias:string;record:PublicRecord};
export type SlotStatus={slot:UsageSlot|"UNCLASSIFIED";state:"SHARED"|"NO_CHECK_IN"|"OPTIONAL";outcome?:"CURRENT_LABEL"|"EXPIRED_LABEL"};
export type CaregiverStatus={alias:string;available:boolean;pairingVerified:boolean;slots:SlotStatus[];details?:PublicRecord};
export class SharingError extends Error{constructor(public readonly code:"INVALID_INPUT"|"DENIED"|"CONFLICT"|"RATE_LIMIT"|"UNAVAILABLE"){super(code);}}
