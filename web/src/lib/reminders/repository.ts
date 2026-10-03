import { randomUUID } from "node:crypto";
import { getSql } from "../db";
import { SharingError } from "../caregiver/types";
import { subscriptionSchema,type ReminderInput,type Reminder,type Subscription } from "./domain";
import type { DueReminder } from "./dispatch";

export async function reserveRegistration(bucket:string){
  const sql=getSql();
  const rows=await sql`INSERT INTO reminder_registration_throttle(bucket_hash,window_start,attempts)
    VALUES(${bucket},to_timestamp(floor(extract(epoch FROM clock_timestamp())/600)*600),1)
    ON CONFLICT(bucket_hash,window_start) DO UPDATE SET attempts=reminder_registration_throttle.attempts+1
    WHERE reminder_registration_throttle.attempts<5 RETURNING attempts`;
  return rows.length===1;
}
export async function deviceState(hash:string){
  const rows=await getSql()`SELECT id::text,enabled,expires_at::text AS "expiresAt" FROM reminder_devices
    WHERE credential_hash=${hash} AND expires_at>clock_timestamp()`;
  return rows[0] as {id:string;enabled:boolean;expiresAt:string}|undefined;
}
export async function subscribeDevice(hash:string,subscription:Subscription){
  const sql=getSql();
  const results=await sql.transaction([
    sql`INSERT INTO reminder_devices(id,credential_hash,endpoint,subscription,enabled,expires_at)
      VALUES(${randomUUID()}::uuid,${hash},${subscription.endpoint},${JSON.stringify(subscription)}::jsonb,true,clock_timestamp()+interval '90 days')
      ON CONFLICT(credential_hash) DO UPDATE SET endpoint=excluded.endpoint,subscription=excluded.subscription,
        enabled=true,expires_at=excluded.expires_at RETURNING id::text`,
    // Restart retained schedules at their next future time, never replay old occurrences.
    sql`UPDATE medication_reminders r SET next_due=(
      (date_trunc('day',clock_timestamp() AT TIME ZONE 'Asia/Kolkata')+r.local_time::time) AT TIME ZONE 'Asia/Kolkata'
      )+CASE WHEN (clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::time>=r.local_time::time THEN interval '1 day' ELSE interval '0' END
      FROM reminder_devices d WHERE r.device_id=d.id AND d.credential_hash=${hash}`,
  ]);
  if(!results[0].length)throw new SharingError("UNAVAILABLE");
}
export async function listReminders(hash:string):Promise<Reminder[]>{
  const rows=await getSql()`SELECT r.id::text,r.token,r.local_time AS time,r.language,r.enabled,r.next_due::text AS "nextDue",
    (t.status='ACTIVE' AND t.expiry_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND t.expiry_month>=to_char(clock_timestamp() AT TIME ZONE 'Asia/Kolkata','YYYY-MM')) AS available
    FROM medication_reminders r JOIN reminder_devices d ON r.device_id=d.id JOIN tags t ON r.token=t.token
    WHERE d.credential_hash=${hash} AND d.expires_at>clock_timestamp() ORDER BY r.local_time,r.id LIMIT 10`;
  return rows as Reminder[];
}
export async function saveReminder(hash:string,input:ReminderInput){
  const sql=getSql();
  const results=await sql.transaction([
    sql`SELECT id FROM reminder_devices WHERE credential_hash=${hash} AND enabled AND expires_at>clock_timestamp() FOR UPDATE`,
    sql`SELECT token FROM tags WHERE token=${input.token} FOR SHARE`,
    sql`WITH chosen AS MATERIALIZED (SELECT clock_timestamp() AS now)
      INSERT INTO medication_reminders(id,device_id,token,local_time,language,enabled,next_due)
      SELECT ${randomUUID()}::uuid,d.id,t.token,${input.time},${input.language},${input.enabled},
        ((date_trunc('day',c.now AT TIME ZONE 'Asia/Kolkata')+${input.time}::time) AT TIME ZONE 'Asia/Kolkata')+
        CASE WHEN (c.now AT TIME ZONE 'Asia/Kolkata')::time>=${input.time}::time THEN interval '1 day' ELSE interval '0' END
      FROM reminder_devices d,tags t,chosen c WHERE d.credential_hash=${hash} AND d.enabled AND d.expires_at>c.now
        AND t.token=${input.token} AND t.status='ACTIVE' AND t.expiry_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND t.expiry_month>=to_char(c.now AT TIME ZONE 'Asia/Kolkata','YYYY-MM')
        AND ((SELECT count(*) FROM medication_reminders WHERE device_id=d.id)<10 OR EXISTS
          (SELECT 1 FROM medication_reminders WHERE device_id=d.id AND token=${input.token} AND local_time=${input.time}))
      ON CONFLICT(device_id,token,local_time) DO UPDATE SET enabled=excluded.enabled,language=excluded.language,next_due=excluded.next_due
      RETURNING id::text`,
  ]);
  if(!results[2].length)throw new SharingError("CONFLICT");
}
export async function deleteReminder(hash:string,id:string){
  const rows=await getSql()`DELETE FROM medication_reminders r USING reminder_devices d
    WHERE r.device_id=d.id AND d.credential_hash=${hash} AND d.expires_at>clock_timestamp() AND r.id=${id}::uuid RETURNING r.id`;
  if(!rows.length)throw new SharingError("DENIED");
}
export async function pauseDevice(hash:string){
  const rows=await getSql()`UPDATE reminder_devices SET enabled=false WHERE credential_hash=${hash} AND expires_at>clock_timestamp() RETURNING id`;
  if(!rows.length)throw new SharingError("DENIED");
}
export async function deleteDevice(hash:string){await getSql()`DELETE FROM reminder_devices WHERE credential_hash=${hash}`;}

export async function claimDue(ownedFixtureId?:string):Promise<DueReminder[]>{
  const rows=await getSql()`WITH due AS MATERIALIZED (
    SELECT r.id,r.next_due AS due_at FROM medication_reminders r JOIN reminder_devices d ON r.device_id=d.id
    WHERE r.enabled AND d.enabled AND d.expires_at>clock_timestamp() AND r.next_due<=clock_timestamp()
      AND (${ownedFixtureId??null}::uuid IS NULL OR r.id=${ownedFixtureId??null}::uuid)
    ORDER BY r.next_due FOR UPDATE OF r SKIP LOCKED LIMIT 5
  ), advanced AS (
    UPDATE medication_reminders r SET next_due=(
      (date_trunc('day',clock_timestamp() AT TIME ZONE 'Asia/Kolkata')+r.local_time::time) AT TIME ZONE 'Asia/Kolkata'
      )+CASE WHEN (clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::time>=r.local_time::time THEN interval '1 day' ELSE interval '0' END
    FROM due WHERE r.id=due.id RETURNING r.id::text,r.device_id::text AS "deviceId",r.token,r.language
  ) SELECT a.*,due.due_at::text AS "dueAt" FROM advanced a JOIN due ON a.id=due.id::text`;
  return rows as DueReminder[];
}
export async function currentSubscription(item:DueReminder):Promise<Subscription|null>{
  const rows=await getSql()`SELECT d.subscription FROM medication_reminders r JOIN reminder_devices d ON r.device_id=d.id
    JOIN tags t ON r.token=t.token WHERE r.id=${item.id}::uuid AND d.id=${item.deviceId}::uuid AND r.token=${item.token}
    AND r.enabled AND d.enabled AND d.expires_at>clock_timestamp() AND t.status='ACTIVE'
    AND t.expiry_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND t.expiry_month>=to_char(clock_timestamp() AT TIME ZONE 'Asia/Kolkata','YYYY-MM')`;
  const parsed=subscriptionSchema.safeParse(rows[0]?.subscription);return parsed.success?parsed.data:null;
}
export const removeGoneDevice=(id:string)=>getSql()`DELETE FROM reminder_devices WHERE id=${id}::uuid`;
export async function cleanupReminders(){
  await getSql().transaction([
    getSql()`DELETE FROM reminder_devices WHERE expires_at<=clock_timestamp()`,
    getSql()`DELETE FROM reminder_registration_throttle WHERE window_start<clock_timestamp()-interval '1 day'`,
  ]);
}
