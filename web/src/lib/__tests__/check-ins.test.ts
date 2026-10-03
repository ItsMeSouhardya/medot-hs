import { afterEach,expect,it,vi } from "vitest";
import { confirmIdentification } from "../caregiver/check-ins";
import { saveConsent,createSharingGroup,createCaregiverInvite,redeemCaregiverInvite } from "../caregiver/consent";
import type { OwnerAccess } from "../caregiver/types";
const repo=vi.hoisted(()=>({atomicCheckIn:vi.fn(),atomicConsent:vi.fn(),insertSharingGroup:vi.fn(),insertCaregiverInvite:vi.fn(),claimCaregiverInvite:vi.fn(),lookupOwnerSession:vi.fn()}));
vi.mock("../caregiver/repository",()=>repo);
const groupId="12345678-1234-4234-8234-123456789012",owner:OwnerAccess={kind:"owner",groupId,sessionId:"12345678-1234-4234-8234-123456789013",consentVersion:0,managementOnly:false},token="abcdefghijklmnopqrstuv";
afterEach(()=>vi.clearAllMocks());
it("allows only the enrolled sharing-capable owner and uses an atomic server result",async()=>{
  for(const [group,tok,slot,access] of [[groupId,token,"EVENING",{...owner,managementOnly:true}],[owner.sessionId,token,"EVENING",owner],[groupId,"invalid","EVENING",owner]] as const)await expect(confirmIdentification(group,tok,slot,access)).rejects.toThrow("DENIED");
  expect(repo.atomicCheckIn).not.toHaveBeenCalled();repo.atomicCheckIn.mockResolvedValueOnce({day:"2026-10-03",outcome:"EXPIRED_LABEL"});
  expect(await confirmIdentification(groupId,token,"EVENING",owner)).toEqual({day:"2026-10-03",outcome:"EXPIRED_LABEL"});
  repo.atomicCheckIn.mockResolvedValueOnce(null);await expect(confirmIdentification(groupId,token,"UNCLASSIFIED",owner)).rejects.toThrow("DENIED");
});
it("rejects stale consent versions before mutation and lets the atomic guard deny unenrolled tokens",async()=>{
  const input={enabled:true,scopes:{status:true,details:false},selectedTokens:[token],expectedVersion:1};
  await expect(saveConsent(input,owner)).rejects.toThrow("CONFLICT");expect(repo.atomicConsent).not.toHaveBeenCalled();
  repo.atomicConsent.mockResolvedValueOnce(null);await expect(saveConsent({...input,expectedVersion:0},owner)).rejects.toThrow("CONFLICT");
  repo.atomicConsent.mockResolvedValueOnce({version:1});expect(await saveConsent({...input,expectedVersion:0},owner)).toEqual({version:1});
});
it("setup requires patient agreement and an operator and stores only a hashed one-time code",async()=>{
  await expect(createSharingGroup({selectedTokens:[token],patientAgreed:false},"operator")).rejects.toThrow("INVALID_INPUT");await expect(createSharingGroup({selectedTokens:[token],patientAgreed:true},"")).rejects.toThrow("DENIED");expect(repo.insertSharingGroup).not.toHaveBeenCalled();
  repo.insertSharingGroup.mockResolvedValueOnce(groupId);const result=await createSharingGroup({selectedTokens:[token],patientAgreed:true},"operator");expect(result.groupId===groupId&&result.ownerCode.length===43).toBe(true);
  const args=repo.insertSharingGroup.mock.calls[0];expect(args[2].length===64&&args[2]!==result.ownerCode).toBe(true);
});
it("invites require enabled owner access, bound scopes and atomic single-use redemption",async()=>{
  await expect(createCaregiverInvite({scopes:{status:true}}, {...owner,managementOnly:true})).rejects.toThrow("DENIED");expect(repo.insertCaregiverInvite).not.toHaveBeenCalled();
  repo.insertCaregiverInvite.mockResolvedValueOnce(true);const result=await createCaregiverInvite({scopes:{status:true}},owner);expect(result.code.length===43).toBe(true);
  await expect(redeemCaregiverInvite(token,"caregiver")).rejects.toThrow("INVALID_INPUT");await expect(redeemCaregiverInvite("s".repeat(43),"")).rejects.toThrow("DENIED");expect(repo.claimCaregiverInvite).not.toHaveBeenCalled();
  repo.claimCaregiverInvite.mockResolvedValueOnce(groupId);expect(await redeemCaregiverInvite("s".repeat(43),"caregiver")).toEqual({groupId});
  repo.claimCaregiverInvite.mockResolvedValueOnce(null);await expect(redeemCaregiverInvite("s".repeat(43),"caregiver")).rejects.toThrow("DENIED");
});
