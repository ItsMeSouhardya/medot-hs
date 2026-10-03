import { randomUUID,createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import nextEnv from "@next/env";
import { beforeAll,afterAll,describe,expect,it } from "vitest";
import { getSql } from "@/lib/db";
import { generateToken } from "@/lib/domain";
import { newDeviceSecret,hashSecret } from "@/lib/reminders/security";
import * as repo from "@/lib/reminders/repository";
import type { ReminderInput,Subscription } from "@/lib/reminders/domain";

describe.skipIf(process.env.MEDOT_RUN_REMINDER_DB_TESTS!=="1")("owned Neon reminder fixtures",()=>{
  const actor="reminder-software-fixture",medicineId="reminder-fixture-"+randomUUID(),tokens:string[]=[],hashes:string[]=[];
  let original:unknown;
  const subscription=(suffix:string):Subscription=>({endpoint:`https://fcm.googleapis.com/fcm/send/owned-fixture-${suffix}`,keys:{p256dh:Buffer.concat([Buffer.from([4]),Buffer.alloc(64,1)]).toString("base64url"),auth:Buffer.alloc(16,2).toString("base64url")}});
  async function snapshot(){const rows=await getSql()`SELECT 'medicines' AS kind,jsonb_agg(to_jsonb(m) ORDER BY id) AS rows FROM medicines m
    UNION ALL SELECT 'tags',jsonb_agg(to_jsonb(t) ORDER BY token) FROM tags t
    UNION ALL SELECT 'audio',jsonb_agg(to_jsonb(a) ORDER BY token,language,script_kind) FROM tag_audio a
    UNION ALL SELECT 'budget',jsonb_agg(to_jsonb(b) ORDER BY day) FROM speech_budget b ORDER BY kind`;
    return createHash("sha256").update(JSON.stringify(rows)).digest("hex");}
  beforeAll(async()=>{
    nextEnv.loadEnvConfig(process.cwd());original=await snapshot();
    for(let i=0;i<2;i++)expect(spawnSync(process.execPath,["scripts/setup-db.mjs"],{cwd:process.cwd(),env:process.env,encoding:"utf8",timeout:30000}).status).toBe(0);
    expect(await snapshot()).toEqual(original);
    await getSql()`INSERT INTO medicines(id,generic_name,strength,dosage_form,record_kind,created_by)
      VALUES(${medicineId},'Reminder fictional SQL label','Fixture strength','Fixture form','FICTIONAL_DEMO',${actor})`;
  },70000);
  afterAll(async()=>{
    for(const hash of hashes)await repo.deleteDevice(hash);
    for(const token of tokens)await getSql()`DELETE FROM tags WHERE token=${token} AND medicine_id=${medicineId} AND created_by=${actor}`;
    await getSql()`DELETE FROM medicines WHERE id=${medicineId} AND created_by=${actor} AND NOT EXISTS(SELECT 1 FROM tags WHERE medicine_id=medicines.id)`;
    expect(await snapshot()).toEqual(original);
  });
  async function fixture(expiry="2099-12",status="ACTIVE"){
    const token=generateToken();tokens.push(token);await getSql()`INSERT INTO tags(token,medicine_id,batch_number,expiry_month,instruction,status,created_by)
      VALUES(${token},${medicineId},'REMINDER-SOFTWARE-FIXTURE',${expiry},'Software fixture only.',${status},${actor})`;return token;
  }
  async function device(){const hash=hashSecret(newDeviceSecret());hashes.push(hash);await repo.subscribeDevice(hash,subscription(randomUUID()));return hash;}
  const input=(token:string,time="09:00"):ReminderInput=>({token,time,language:"en",enabled:true});
  it("isolates devices, rejects expired/revoked/pending records and never shares capability data",async()=>{
    const a=await device(),b=await device(),token=await fixture();await repo.saveReminder(a,input(token));
    expect(await repo.listReminders(b)).toEqual([]);const list=await repo.listReminders(a);expect(list).toHaveLength(1);
    expect(JSON.stringify(list)).not.toMatch(/endpoint|subscription|credential/);
    await expect(repo.deleteReminder(b,list[0].id)).rejects.toThrow("DENIED");
    for(const other of [await fixture("2000-01"),await fixture("badtext"),await fixture("2099-12","PENDING"),await fixture("2099-12","REVOKED")])await expect(repo.saveReminder(a,input(other))).rejects.toThrow("CONFLICT");
  });
  it("serializes concurrent registrations at ten schedules and deduplicates the same time",async()=>{
    const hash=await device(),token=await fixture();const results=await Promise.allSettled(Array.from({length:12},(_,i)=>repo.saveReminder(hash,input(token,`${String(i).padStart(2,"0")}:00`))));
    expect(results.filter(result=>result.status==="fulfilled")).toHaveLength(10);const list=await repo.listReminders(hash);expect(list).toHaveLength(10);
    await repo.saveReminder(hash,input(token,list[0].time));expect(await repo.listReminders(hash)).toHaveLength(10);
  });
  it("claims an occurrence once across concurrent dispatchers and rechecks withdrawal and pause",async()=>{
    const hash=await device(),token=await fixture();await repo.saveReminder(hash,input(token));const [reminder]=await repo.listReminders(hash);
    await getSql()`UPDATE medication_reminders SET next_due=clock_timestamp()-interval '1 minute' WHERE id=${reminder.id}::uuid`;
    const runs=await Promise.all([repo.claimDue(reminder.id),repo.claimDue(reminder.id)]);const matching=runs.flat().filter(item=>item.id===reminder.id);expect(matching).toHaveLength(1);
    expect(await repo.currentSubscription(matching[0])).toBeTruthy();
    await repo.pauseDevice(hash);expect(await repo.currentSubscription(matching[0])).toBeNull();
    await repo.subscribeDevice(hash,subscription(randomUUID()));expect(new Date((await repo.listReminders(hash))[0].nextDue).getTime()).toBeGreaterThan(Date.now());
    await getSql()`UPDATE tags SET status='REVOKED' WHERE token=${token} AND created_by=${actor}`;
    expect(await repo.currentSubscription(matching[0])).toBeNull();expect((await repo.listReminders(hash))[0].available).toBe(false);
    await repo.deleteDevice(hash);expect(await repo.listReminders(hash)).toEqual([]);
  });
  it("cannot take another device's subscription endpoint and expired consent cannot save",async()=>{
    const hash=await device(),other=await device(),row=await repo.deviceState(hash);
    const [existing]=await getSql()`SELECT subscription FROM reminder_devices WHERE id=${row!.id}::uuid`;
    await expect(repo.subscribeDevice(other,existing.subscription as Subscription)).rejects.toThrow();
    const token=await fixture();await getSql()`UPDATE reminder_devices SET expires_at=clock_timestamp()-interval '1 second' WHERE credential_hash=${hash}`;
    expect(await repo.deviceState(hash)).toBeUndefined();await expect(repo.saveReminder(hash,input(token))).rejects.toThrow("CONFLICT");
  });
});
