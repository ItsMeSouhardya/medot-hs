import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { remindersGet,remindersPost,remindersDelete,subscriptionPost,subscriptionPause,subscriptionDelete,remindersCron } from "../reminders/handler";
const mocks=vi.hoisted(()=>({device:vi.fn(),list:vi.fn(),save:vi.fn(),remove:vi.fn(),pause:vi.fn(),erase:vi.fn(),reserve:vi.fn(),subscribe:vi.fn(),config:vi.fn(),claim:vi.fn(),current:vi.fn(),send:vi.fn(),cleanup:vi.fn()}));
vi.mock("../reminders/repository",()=>({deviceState:mocks.device,listReminders:mocks.list,saveReminder:mocks.save,deleteReminder:mocks.remove,pauseDevice:mocks.pause,deleteDevice:mocks.erase,reserveRegistration:mocks.reserve,subscribeDevice:mocks.subscribe,claimDue:mocks.claim,currentSubscription:mocks.current,cleanupReminders:mocks.cleanup,removeGoneDevice:vi.fn()}));
vi.mock("../reminders/push",()=>({pushConfiguration:mocks.config,sendPush:mocks.send}));
const secret="s".repeat(43),token="a".repeat(22);
const subscription={endpoint:"https://fcm.googleapis.com/fcm/send/fixture",keys:{p256dh:Buffer.concat([Buffer.from([4]),Buffer.alloc(64,1)]).toString("base64url"),auth:Buffer.alloc(16,2).toString("base64url")}};
function req(body:unknown={},cookie=`medot_reminders=${secret}`,origin="https://medot.example"){
  return new Request("https://medot.example/api/reminders",{method:"POST",headers:{cookie,origin,"Content-Type":"application/json"},body:JSON.stringify(body)});
}
beforeEach(()=>{vi.stubEnv("APP_ORIGIN","https://medot.example");vi.stubEnv("SHARING_RATE_LIMIT_SECRET","test-salt-for-reminders-at-least-32-characters");mocks.config.mockReturnValue({publicKey:"public-only"});mocks.device.mockResolvedValue({id:"device",enabled:true,expiresAt:"2099-01-01"});mocks.list.mockResolvedValue([]);mocks.reserve.mockResolvedValue(true);});
afterEach(()=>{vi.resetAllMocks();vi.unstubAllEnvs();});
it("rejects cross-origin mutations before any DB calls",async()=>{
  for(const handler of [remindersPost,remindersDelete,subscriptionPost,subscriptionPause,subscriptionDelete])expect((await handler(req({},undefined,"https://outsider.example"))).status).toBe(403);
  expect(mocks.device).not.toHaveBeenCalled();expect(mocks.erase).not.toHaveBeenCalled();expect(mocks.reserve).not.toHaveBeenCalled();
});
it("requires a valid device cookie for private schedules and scopes deletion to its hash",async()=>{
  expect((await remindersPost(req({token,time:"09:00",language:"en",enabled:true},""))).status).toBe(403);expect(mocks.save).not.toHaveBeenCalled();
  const id="12345678-1234-4234-8234-123456789012";expect((await remindersDelete(req({id}))).status).toBe(200);
  expect(mocks.remove.mock.calls[0][0]).toMatch(/^[a-f0-9]{64}$/);expect(mocks.remove.mock.calls[0][1]).toBe(id);
});
it("does not enumerate reminders or expose subscription endpoints, capability or private config",async()=>{
  const response=await remindersGet(req({},"")),body=await response.json();expect(body.reminders).toEqual([]);expect(body.enabled).toBe(false);expect(mocks.device).not.toHaveBeenCalled();expect(mocks.list).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toContain("no-store");expect(response.headers.get("referrer-policy")).toBe("no-referrer");expect(JSON.stringify(body)).not.toMatch(/endpoint|credential|privateKey/);
});
it("requires explicit subscription consent and throttles registration before storage",async()=>{
  expect((await subscriptionPost(req({subscription}))).status).toBe(400);expect(mocks.subscribe).not.toHaveBeenCalled();
  mocks.reserve.mockResolvedValue(false);expect((await subscriptionPost(req({subscription,consent:true}))).status).toBe(429);
  mocks.reserve.mockResolvedValue(true);const response=await subscriptionPost(req({subscription,consent:true},""));expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toMatch(/HttpOnly; SameSite=Strict.*Secure/);expect(mocks.subscribe.mock.calls[0][0]).toMatch(/^[a-f0-9]{64}$/);
  expect(await response.json()).toEqual({ok:true});
});
it("renews the same capability cookie when renewing an existing device's 90-day consent",async()=>{
  const response=await subscriptionPost(req({subscription,consent:true}));expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toContain(`medot_reminders=${secret}`);
  expect(response.headers.get("set-cookie")).toContain("Max-Age=7776000");
});
it("rejects unbounded or arbitrary dose/time/user input",async()=>{
  for(const body of [{token,time:"09:00",language:"en",enabled:true,userId:"forged"},{token,time:"morning",language:"en",enabled:true},{data:"x".repeat(5000)}])expect((await remindersPost(req(body))).status).toBe(400);
  expect(mocks.save).not.toHaveBeenCalled();
});
it("does not clear a device cookie when server deletion fails",async()=>{
  mocks.erase.mockRejectedValue(new Error("DB unavailable"));const response=await subscriptionDelete(req());expect(response.status).toBe(503);expect(response.headers.has("set-cookie")).toBe(false);
});
it("requires cron secret before cleanup or claiming, with no public dispatch",async()=>{
  expect((await remindersCron(req())).status).toBe(403);expect(mocks.claim).not.toHaveBeenCalled();expect(mocks.cleanup).not.toHaveBeenCalled();
  vi.stubEnv("REMINDER_CRON_SECRET",secret);mocks.claim.mockResolvedValue([]);
  const response=await remindersCron(new Request("https://medot.example/api/reminders/dispatch",{method:"POST",headers:{authorization:`Bearer ${secret}`}}));expect(response.status).toBe(200);expect(await response.json()).toEqual({claimed:0,sent:0,skipped:0,failed:0});
});
it("returns an HTTP failure for the free scheduler when push delivery fails",async()=>{
  vi.stubEnv("REMINDER_CRON_SECRET",secret);
  mocks.claim.mockResolvedValue([{id:"fixture",deviceId:"device",token,language:"en",dueAt:new Date().toISOString()}]);
  mocks.current.mockResolvedValue(subscription);mocks.send.mockRejectedValue(new Error("Provider unavailable"));
  const response=await remindersCron(new Request("https://medot.example/api/reminders/dispatch",{method:"POST",headers:{authorization:`Bearer ${secret}`}}));
  expect(response.status).toBe(503);expect(await response.json()).toEqual({claimed:1,sent:0,skipped:0,failed:1});
});
