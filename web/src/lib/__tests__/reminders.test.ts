import { describe, expect, it, vi } from "vitest";
import { nextReminder, reminderSchema, subscriptionSchema, notificationPayload } from "../reminders/domain";
import { dispatchReminders, type DispatchDependencies } from "../reminders/dispatch";
import { deviceHash, cronAuthorized } from "../reminders/security";

const token="a".repeat(22);
const subscription={endpoint:"https://fcm.googleapis.com/fcm/send/test",keys:{p256dh:Buffer.concat([Buffer.from([4]),Buffer.alloc(64,1)]).toString("base64url"),auth:Buffer.alloc(16,2).toString("base64url")}};
describe("device reminders",()=>{
  it("chooses the next chosen India time, including midnight and exact-time registration",()=>{
    expect(nextReminder("00:00",new Date("2026-10-02T18:29:00Z")).toISOString()).toBe("2026-10-02T18:30:00.000Z");
    expect(nextReminder("00:00",new Date("2026-10-02T18:30:00Z")).toISOString()).toBe("2026-10-03T18:30:00.000Z");
    expect(nextReminder("19:30",new Date("2026-12-31T14:00:01Z")).toISOString()).toBe("2027-01-01T14:00:00.000Z");
    expect(()=>nextReminder("25:00",new Date())).toThrow();
  });
  it("requires explicit consent and chosen times, rejecting inferred doses or supplied identity",()=>{
    expect(reminderSchema.safeParse({token,time:"19:30",language:"bn",enabled:true}).success).toBe(true);
    for(const body of [{token,time:"evening",language:"en",enabled:true},{token,time:"09:00",language:"en",enabled:true,dose:"2"},{token:"short",time:"09:00",language:"en",enabled:true}])expect(reminderSchema.safeParse(body).success).toBe(false);
  });
  it("allows real push providers and blocks SSRF, credential URLs, ports and malformed encryption keys",()=>{
    expect(subscriptionSchema.safeParse(subscription).success).toBe(true);
    for(const endpoint of ["http://fcm.googleapis.com/test","https://127.0.0.1/test","https://fcm.googleapis.com.evil.test/x","https://a@fcm.googleapis.com/test","https://fcm.googleapis.com:444/test","https://example.com/test","https://fcm.googleapis.com/test#frag"])expect(subscriptionSchema.safeParse({...subscription,endpoint}).success).toBe(false);
    expect(subscriptionSchema.safeParse({...subscription,keys:{p256dh:"A".repeat(87),auth:"A".repeat(22)}}).success).toBe(false);
  });
  it("keeps credentials in one cookie and requires the exact scheduler bearer secret",()=>{
    const secret="s".repeat(43);
    expect(deviceHash(new Request("https://medot.test",{headers:{cookie:`medot_reminders=${secret}`}}))).toMatch(/^[a-f0-9]{64}$/);
    expect(deviceHash(new Request("https://medot.test",{headers:{cookie:`medot_reminders=${secret}; medot_reminders=${secret}`}}))).toBeNull();
    expect(cronAuthorized(new Request("https://medot.test",{headers:{authorization:`Bearer ${secret}`}}),secret)).toBe(true);
    expect(cronAuthorized(new Request("https://medot.test",{headers:{authorization:"Bearer wrong"}}),secret)).toBe(false);
    expect(cronAuthorized(new Request("https://medot.test"),undefined)).toBe(false);
  });
  it.each(["en","bn","hi"] as const)("keeps medicine/token/credentials out of %s lock-screen payload",language=>{
    const payload=notificationPayload(language);
    expect(payload.url).toBe("/reminders");
    expect(JSON.stringify(payload)).not.toContain(token);
    expect(payload.title).toBeTruthy();expect(payload.body).toBeTruthy();
  });
});

describe("dispatch safety",()=>{
  const item={id:"id",deviceId:"device",token,language:"en" as const,dueAt:"2026-10-03T14:00:00Z"};
  const deps=():DispatchDependencies=>({claim:vi.fn(async()=>[item]),current:vi.fn(async()=>subscription),send:vi.fn(async()=>{}),removeDevice:vi.fn(async()=>{}),now:()=>new Date("2026-10-03T14:01:00Z")});
  it("rechecks disabled/revoked/expired state before dispatch",async()=>{
    const d=deps();d.current=vi.fn(async()=>null);expect(await dispatchReminders(d)).toEqual({claimed:1,sent:0,skipped:1,failed:0});expect(d.send).not.toHaveBeenCalled();
  });
  it("does not deliver an accumulated stale reminder",async()=>{
    const d=deps();d.now=()=>new Date("2026-10-03T14:06:00Z");await dispatchReminders(d);expect(d.send).not.toHaveBeenCalled();
  });
  it("isolates a failing provider, removes gone subscriptions, and never retries an occurrence",async()=>{
    const d=deps();d.send=vi.fn(async()=>{throw {statusCode:410};});expect((await dispatchReminders(d)).failed).toBe(1);expect(d.send).toHaveBeenCalledTimes(1);expect(d.removeDevice).toHaveBeenCalledWith("device");
  });
  it("counts successful sends as provider acceptance, with generic payload",async()=>{
    const d=deps();expect((await dispatchReminders(d)).sent).toBe(1);expect(d.send).toHaveBeenCalledWith(subscription,notificationPayload("en"));
  });
});
