import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { getOwnerAccess,OWNER_COOKIE } from "../caregiver/owner-session";
import { getCaregiverAccess } from "../caregiver/access";
import { consentSchema,codeSchema,setupSchema } from "../caregiver/types";
import { hashCredential,newCredential } from "../caregiver/credentials";
const repo=vi.hoisted(()=>({lookupOwnerSession:vi.fn(),lookupCaregiverGrant:vi.fn()}));
vi.mock("../caregiver/repository",()=>repo);
const groupId="12345678-1234-4234-8234-123456789012",sessionId="12345678-1234-4234-8234-123456789013",secret="s".repeat(43);
const session={groupId,sessionId,sessionVersion:2,groupVersion:2,sessionExpiresAt:"2099-01-01T00:00:00Z",sessionRevoked:false,managementOnly:false,enabled:true,consentExpiresAt:"2099-01-01T00:00:00Z"};
const grant={groupId,userId:"caregiver-one",consentVersion:2,grantVersion:2,enabled:true,status:true,details:false,grantStatus:true,grantDetails:false,expiresAt:"2099-01-01T00:00:00Z",revoked:false};
beforeEach(()=>{repo.lookupOwnerSession.mockResolvedValue(session);repo.lookupCaregiverGrant.mockResolvedValue(grant);});
afterEach(()=>vi.clearAllMocks());
const request=(value=secret)=>new Request("https://medot.example/sharing",{headers:{cookie:`${OWNER_COOKIE}=${value}`}});
it("denies absent/public-token/duplicate-cookie credentials before a session lookup",async()=>{
  for(const req of [new Request("https://medot.example/sharing"),request("abcdefghijklmnopqrstuv"),new Request("https://medot.example/sharing",{headers:{cookie:`${OWNER_COOKIE}=${secret}; ${OWNER_COOKIE}=${secret}`}})])expect(await getOwnerAccess(req)).toEqual({kind:"denied"});
  expect(repo.lookupOwnerSession).not.toHaveBeenCalled();
});
it("uses a hashed private credential and returns a bounded current owner session",async()=>{
  expect(await getOwnerAccess(request())).toEqual({kind:"owner",groupId,sessionId,consentVersion:2,managementOnly:false});
  expect(repo.lookupOwnerSession).toHaveBeenCalledWith(hashCredential(secret));
  for(const changed of [{sessionExpiresAt:"2000-01-01"},{sessionRevoked:true},{sessionVersion:1}]){repo.lookupOwnerSession.mockResolvedValueOnce({...session,...changed});expect(await getOwnerAccess(request())).toEqual({kind:"denied"});}
});
it("off or expired consent restricts an otherwise valid owner to management",async()=>{
  for(const changed of [{enabled:false},{consentExpiresAt:"2000-01-01"},{managementOnly:true}]){repo.lookupOwnerSession.mockResolvedValueOnce({...session,...changed});expect(await getOwnerAccess(request())).toMatchObject({kind:"owner",managementOnly:true});}
});
it("caregiver access requires matching identity, group, version, live consent and both scopes",async()=>{
  expect(await getCaregiverAccess("caregiver-one",groupId,"status")).toEqual({kind:"granted",consentVersion:2,details:false});
  expect(await getCaregiverAccess("caregiver-one",groupId,"details")).toEqual({kind:"denied"});
  for(const changed of [{userId:"outsider"},{groupId:sessionId},{grantVersion:1},{enabled:false},{revoked:true},{expiresAt:"2000-01-01"},{status:false},{grantStatus:false}]){repo.lookupCaregiverGrant.mockResolvedValueOnce({...grant,...changed});expect(await getCaregiverAccess("caregiver-one",groupId,"status")).toEqual({kind:"denied"});}
  repo.lookupCaregiverGrant.mockResolvedValueOnce({...grant,details:true,grantDetails:true});expect(await getCaregiverAccess("caregiver-one",groupId,"details")).toMatchObject({kind:"granted",details:true});
});
it("guessed IDs, missing identities and absent grants cannot disclose a group",async()=>{
  expect(await getCaregiverAccess("",groupId,"status")).toEqual({kind:"denied"});expect(await getCaregiverAccess("caregiver-one","not-a-group","status")).toEqual({kind:"denied"});expect(repo.lookupCaregiverGrant).not.toHaveBeenCalled();
  repo.lookupCaregiverGrant.mockResolvedValueOnce(null);expect(await getCaregiverAccess("outsider",groupId,"status")).toEqual({kind:"denied"});
});
it("requires explicit status consent, unique bounded selected tokens and strict code/setup bodies",()=>{
  const input={enabled:true,scopes:{status:true},selectedTokens:["abcdefghijklmnopqrstuv"],expectedVersion:0};
  expect(consentSchema.parse(input).scopes.details).toBe(false);
  for(const changed of [{scopes:{status:false,details:true}},{selectedTokens:[]},{selectedTokens:Array(6).fill("abcdefghijklmnopqrstuv")},{selectedTokens:Array(2).fill("abcdefghijklmnopqrstuv")},{expectedVersion:-1},{enabled:false,scopes:{status:true}}])expect(consentSchema.safeParse({...input,...changed}).success).toBe(false);
  expect(codeSchema.safeParse({code:"abcdefghijklmnopqrstuv"}).success).toBe(false);expect(codeSchema.safeParse({code:secret,userId:"outsider"}).success).toBe(false);
  expect(setupSchema.safeParse({selectedTokens:input.selectedTokens,patientAgreed:false}).success).toBe(false);
  const value=newCredential();expect(value.length===43).toBe(true);expect(hashCredential(value).length===64).toBe(true);
});
