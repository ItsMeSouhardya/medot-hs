import { afterEach,expect,it,vi } from "vitest";
import { POST as exchange } from "@/app/api/sharing/session/route";
import { POST as checkIn } from "@/app/api/sharing/check-ins/route";
import { GET as records } from "@/app/api/sharing/owner-records/route";
import { POST as redeem } from "@/app/api/caregiver/redeem/route";
import { POST as setup } from "@/app/api/admin/sharing-groups/route";
import { ownerCookie } from "../caregiver/session-exchange";
import { boundedBody } from "../caregiver/http";
const mocks=vi.hoisted(()=>({owner:vi.fn(),session:vi.fn(),attempt:vi.fn(),caregiver:vi.fn(),pharmacy:vi.fn(),check:vi.fn(),records:vi.fn(),setup:vi.fn(),claim:vi.fn()}));
vi.mock("../caregiver/repository",()=>({lookupOwnerSession:mocks.owner,reserveOwnerAttempt:mocks.attempt,insertOwnerSession:mocks.session,ownerRecords:mocks.records,atomicCheckIn:mocks.check,insertSharingGroup:mocks.setup,claimCaregiverInvite:mocks.claim}));
vi.mock("../caregiver/clerk-user",()=>({caregiverUser:mocks.caregiver}));vi.mock("../pharmacy-auth",()=>({getPharmacyAccess:mocks.pharmacy}));
const token="abcdefghijklmnopqrstuv",groupId="12345678-1234-4234-8234-123456789012";
const request=(body:unknown,origin="https://medot.example",cookie="")=>new Request("https://medot.example/api/sharing/check-ins",{method:"POST",headers:{origin,cookie,"Content-Type":"application/json"},body:JSON.stringify(body)});
afterEach(()=>{vi.clearAllMocks();vi.unstubAllEnvs();});
it("rejects wrong origins before SQL or credential lookups on every public mutation",async()=>{
  vi.stubEnv("APP_ORIGIN","https://medot.example");for(const route of [exchange,checkIn,redeem])expect((await route(request({code:"s".repeat(43)},"https://outsider.example"))).status).toBe(403);
  expect(mocks.owner).not.toHaveBeenCalled();expect(mocks.attempt).not.toHaveBeenCalled();expect(mocks.caregiver).not.toHaveBeenCalled();
});
it("missing/public-token owner cannot list or write; strict payload rejects client timestamps",async()=>{
  vi.stubEnv("APP_ORIGIN","https://medot.example");
  for(const cookie of ["",`medot_owner=${token}`]){const req=request({token,slot:"EVENING"},undefined,cookie);expect((await checkIn(req)).status).toBe(403);expect((await records(req)).status).toBe(403);}
  expect(mocks.owner).not.toHaveBeenCalled();expect(mocks.check).not.toHaveBeenCalled();
  mocks.owner.mockResolvedValue({groupId,sessionId:groupId,sessionVersion:0,groupVersion:0,sessionExpiresAt:"2099-01-01",sessionRevoked:false,managementOnly:false,enabled:true,consentExpiresAt:"2099-01-01"});
  expect((await checkIn(request({token,slot:"EVENING",day:"2099-01-01"},undefined,`medot_owner=${"s".repeat(43)}`))).status).toBe(400);expect(mocks.check).not.toHaveBeenCalled();
});
it("caregiver and pharmacy identities are verified server-side and unavailable accounts fail closed",async()=>{
  vi.stubEnv("APP_ORIGIN","https://medot.example");mocks.caregiver.mockResolvedValue(null);mocks.pharmacy.mockResolvedValue({kind:"forbidden"});
  const response=await redeem(request({code:"s".repeat(43),userId:"forged"}));expect(response.status).toBe(401);expect((await setup(request({selectedTokens:[token],patientAgreed:true}))).status).toBe(403);expect(mocks.claim).not.toHaveBeenCalled();expect(mocks.setup).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toContain("no-store");expect(response.headers.get("referrer-policy")).toBe("no-referrer");
});
it("exchanges only a bounded body through durable hashed throttling and private cookies",async()=>{
  vi.stubEnv("APP_ORIGIN","https://medot.example");vi.stubEnv("SHARING_RATE_LIMIT_SECRET","test-exchange-salt-only-01234567890");mocks.attempt.mockResolvedValue(true);mocks.session.mockResolvedValue(groupId);
  const response=await exchange(request({code:"s".repeat(43)}));expect(response.status).toBe(200);const cookie=response.headers.get("set-cookie")??"";expect(cookie.includes("HttpOnly")&&cookie.includes("SameSite=Strict")&&cookie.includes("Secure")).toBe(true);
  const args=mocks.session.mock.calls[0];expect(args.every((arg:string)=>arg.length===64)).toBe(true);expect((await response.json()).code).toBeUndefined();
  mocks.attempt.mockResolvedValue(false);expect((await exchange(request({code:"s".repeat(43)}))).status).toBe(429);
  await expect(boundedBody(request({data:"s".repeat(5000)}))).rejects.toThrow("INVALID_INPUT");
  vi.stubEnv("APP_ORIGIN","http://evil.example");expect(()=>ownerCookie("fixture")).toThrow("UNAVAILABLE");
});
