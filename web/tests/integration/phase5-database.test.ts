import { createHmac,randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterAll,afterEach,beforeAll,describe,expect,it } from "vitest";
import nextEnv from "@next/env";
import { getSql } from "@/lib/db";
import { generateToken } from "@/lib/domain";
import { newCredential,hashCredential } from "@/lib/caregiver/credentials";
import { getOwnerAccess,OWNER_COOKIE } from "@/lib/caregiver/owner-session";
import { createSharingGroup,saveConsent,createCaregiverInvite,redeemCaregiverInvite,rotateOwnerCode } from "@/lib/caregiver/consent";
import { insertOwnerSession,ownerRecords,ownerControls,reserveOwnerAttempt,revokeCaregiverGrant } from "@/lib/caregiver/repository";
import { getCaregiverAccess } from "@/lib/caregiver/access";
import { getCaregiverStatus } from "@/lib/caregiver/status";
import { confirmIdentification } from "@/lib/caregiver/check-ins";
import type { OwnerAccess } from "@/lib/caregiver/types";
import { sharingCleanupStatements } from "../../scripts/sharing-cleanup.mjs";

// Directly inserted ACTIVE rows are isolated fictional SQL fixtures, never
// physical readback or activation evidence. All originals are snapshotted.
describe.skipIf(process.env.MEDOT_RUN_PHASE5_DB_TESTS!=="1")("Phase 5 real consent/privacy SQL",()=>{
  const actor="e6-e7-software-fixture",tokens=new Set<string>(),groups=new Set<string>(),buckets=new Set<string>();let medicineId:string,original:unknown;
  async function snapshot(){const sql=getSql();return await sql`SELECT 'medicines' AS kind,jsonb_agg(to_jsonb(m) ORDER BY id) AS data FROM medicines m
    UNION ALL SELECT 'tags',jsonb_agg(to_jsonb(t) ORDER BY token) FROM tags t
    UNION ALL SELECT 'audio',jsonb_agg(to_jsonb(a) ORDER BY token,language,script_kind) FROM tag_audio a
    UNION ALL SELECT 'budget',jsonb_agg(to_jsonb(b) ORDER BY day) FROM speech_budget b
    UNION ALL SELECT 'throttle',jsonb_agg(to_jsonb(s) ORDER BY token) FROM speech_throttle s ORDER BY kind`;}
  beforeAll(async()=>{
    nextEnv.loadEnvConfig(process.cwd());original=await snapshot();
    for(let i=0;i<2;i++){const result=spawnSync(process.execPath,["scripts/setup-db.mjs"],{cwd:process.cwd(),env:process.env,encoding:"utf8",timeout:25000});expect(result.status,"Additive schema migration status").toBe(0);}
    expect(await snapshot()).toEqual(original);
    medicineId="fixture-"+randomUUID();await getSql()`INSERT INTO medicines(id,generic_name,strength,dosage_form,record_kind,created_by)
      VALUES(${medicineId},'E6 fictional SQL label','Fixture strength','Fixture form','FICTIONAL_DEMO',${actor})`;
  },60000);
  afterEach(async()=>{const sql=getSql();for(const id of groups)await sql`DELETE FROM sharing_groups WHERE id=${id}::uuid AND created_by=${actor}`;
    for(const token of tokens)await sql`DELETE FROM tags WHERE token=${token} AND created_by=${actor} AND batch_number='E6-SOFTWARE-FIXTURE'`;
    for(const hash of buckets)await sql`DELETE FROM sharing_exchange_throttle WHERE bucket_hash=${hash}`;groups.clear();tokens.clear();buckets.clear();});
  afterAll(async()=>{if(medicineId)await getSql()`DELETE FROM medicines WHERE id=${medicineId} AND created_by=${actor} AND NOT EXISTS(SELECT 1 FROM tags WHERE medicine_id=medicines.id)`;expect(await snapshot()).toEqual(original);});
  async function fixture(expiry="2099-12",slots=["EVENING"]){const token=generateToken();tokens.add(token);
    await getSql()`INSERT INTO tags(token,medicine_id,batch_number,expiry_month,instruction,instruction_bn,status,created_by,usage_slots)
      VALUES(${token},${medicineId},'E6-SOFTWARE-FIXTURE',${expiry},'Fictional software fixture only.','শুধুমাত্র সফটওয়্যার ডেমো।','ACTIVE',${actor},${slots}::text[])`;return token;}
  async function setup(token:string){const result=await createSharingGroup({selectedTokens:[token],patientAgreed:true},actor);groups.add(result.groupId);
    const secret=newCredential();expect(await insertOwnerSession(hashCredential(result.ownerCode),hashCredential(secret))).toBeTruthy();
    const request=new Request("https://medot.example/sharing",{headers:{cookie:`${OWNER_COOKIE}=${secret}`}});
    const owner=await getOwnerAccess(request);if(owner.kind!=="owner")throw new Error("Owner fixture failed");return {owner,request,code:result.ownerCode};}
  async function enable(owner:OwnerAccess,request:Request,token:string,details=false){await saveConsent({enabled:true,scopes:{status:true,details},selectedTokens:[token],expectedVersion:owner.consentVersion},owner);const fresh=await getOwnerAccess(request);if(fresh.kind!=="owner")throw new Error("Consent fixture failed");return fresh;}
  it("off/default and selected boundaries; status projection has no public medicine identifier",async()=>{
    const token=await fixture(),other=await fixture(),{owner,request}=await setup(token);
    expect(owner.managementOnly).toBe(true);expect(await ownerRecords(owner)).toHaveLength(0);
    await expect(confirmIdentification(owner.groupId,token,"EVENING",owner)).rejects.toThrow("DENIED");
    await expect(saveConsent({enabled:true,scopes:{status:true,details:false},selectedTokens:[other],expectedVersion:0},owner)).rejects.toThrow("CONFLICT");
    const active=await enable(owner,request,token),invite=await createCaregiverInvite({scopes:{status:true}},active);
    await expect(confirmIdentification(active.groupId,other,"EVENING",active)).rejects.toThrow("DENIED");
    await redeemCaregiverInvite(invite.code,"fixture-caregiver");
    expect((await getCaregiverAccess("outsider",active.groupId,"status")).kind).toBe("denied");
    expect((await getCaregiverAccess("fixture-caregiver",active.groupId,"details")).kind).toBe("denied");
    const statuses=await getCaregiverStatus("fixture-caregiver",active.groupId);expect(statuses).toHaveLength(1);
    expect(Object.keys(statuses[0]).sort()).toEqual(["alias","available","pairingVerified","slots"]);
    expect(statuses[0].slots[0].state).toBe("NO_CHECK_IN");
    expect(await getSql()`SELECT count(*)::int AS n FROM identification_check_ins WHERE group_id=${active.groupId}::uuid`).toEqual([{n:0}]);
  },30000);
  it("concurrent single-use invite redemption has one winner; expired/replayed invitations fail",async()=>{
    const token=await fixture(),setupResult=await setup(token),active=await enable(setupResult.owner,setupResult.request,token);
    const invite=await createCaregiverInvite({scopes:{status:true}},active);
    const results=await Promise.allSettled([redeemCaregiverInvite(invite.code,"fixture-caregiver-a"),redeemCaregiverInvite(invite.code,"fixture-caregiver-b")]);expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    await expect(redeemCaregiverInvite(invite.code,"fixture-caregiver-c")).rejects.toThrow("DENIED");
    const expired=await createCaregiverInvite({scopes:{status:true}},active);await getSql()`UPDATE caregiver_invites SET expires_at=now()-interval '1 second' WHERE secret_hash=${hashCredential(expired.code)}`;
    await expect(redeemCaregiverInvite(expired.code,"fixture-caregiver")).rejects.toThrow("DENIED");
  },30000);
  it("check-ins are daily/idempotent, use stored slots and server expiry; revoked tokens disclose nothing",async()=>{
    const token=await fixture("2000-01"),setupResult=await setup(token),active=await enable(setupResult.owner,setupResult.request,token,true);
    const invite=await createCaregiverInvite({scopes:{status:true,details:true}},active);await redeemCaregiverInvite(invite.code,"fixture-caregiver");
    await expect(confirmIdentification(active.groupId,token,"MORNING",active)).rejects.toThrow("DENIED");
    const results=await Promise.all([confirmIdentification(active.groupId,token,"EVENING",active),confirmIdentification(active.groupId,token,"EVENING",active)]);
    expect(results.every(r=>r.outcome==="EXPIRED_LABEL")).toBe(true);
    const day=await getSql()`SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS day`;expect(results[0].day===day[0].day).toBe(true);
    expect(await getSql()`SELECT count(*)::int AS n FROM identification_check_ins WHERE group_id=${active.groupId}::uuid`).toEqual([{n:1}]);
    expect((await getCaregiverStatus("fixture-caregiver",active.groupId))[0].details?.recordKind).toBe("FICTIONAL_DEMO");
    await getSql()`UPDATE tags SET status='REVOKED',revoked_at=now() WHERE token=${token} AND created_by=${actor}`;
    await expect(confirmIdentification(active.groupId,token,"EVENING",active)).rejects.toThrow("DENIED");
    const status=(await getCaregiverStatus("fixture-caregiver",active.groupId))[0];expect(status.available).toBe(false);expect(status.slots).toHaveLength(0);expect(status.details).toBeUndefined();
  },30000);
  it("consent off/write race leaves no events or grants, keeps only owner management",async()=>{
    // Controlled writer: wait until its group lock is held, then request off
    // while its event remains uncommitted. This reproduces the snapshot race,
    // rather than relying exclusively on Promise scheduling/network timing.
    const token=await fixture(),setupResult=await setup(token),active=await enable(setupResult.owner,setupResult.request,token),sql=getSql();
    const lockKey=parseInt(randomUUID().slice(0,7),16);
    const writer=sql.transaction([
      sql`SELECT id FROM sharing_groups WHERE id=${active.groupId}::uuid FOR UPDATE`,
      sql`SELECT pg_advisory_xact_lock(1669740000,${lockKey}::integer)`,
      sql`INSERT INTO identification_check_ins(group_id,token,slot,day,outcome)
        SELECT g.id,sm.token,'EVENING',(clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date,'CURRENT_LABEL'
        FROM sharing_groups g JOIN sharing_members sm ON sm.group_id=g.id WHERE g.id=${active.groupId}::uuid AND g.enabled AND sm.selected AND sm.token=${token}`,
      sql`SELECT pg_sleep(1.0)`,
    ]);
    let overlapping=false;
    for(let attempt=0;attempt<20;attempt++){const probe=await sql`SELECT pg_try_advisory_xact_lock(1669740000,${lockKey}::integer) AS acquired`;if(probe[0].acquired===false){overlapping=true;break;}await new Promise(resolve=>setTimeout(resolve,20));}
    const off=saveConsent({enabled:false,scopes:{status:false,details:false},selectedTokens:[],expectedVersion:active.consentVersion},active);
    await Promise.all([writer,off]);expect(overlapping,"Controlled race overlapped group lock").toBe(true);
    expect(await sql`SELECT count(*)::int AS n FROM identification_check_ins WHERE group_id=${active.groupId}::uuid`).toEqual([{n:0}]);
    for(let repeat=0;repeat<3;repeat++){const token=await fixture(),setupResult=await setup(token),active=await enable(setupResult.owner,setupResult.request,token);
      const invite=await createCaregiverInvite({scopes:{status:true}},active);await redeemCaregiverInvite(invite.code,"fixture-caregiver");
      const race=await Promise.allSettled([confirmIdentification(active.groupId,token,"EVENING",active),saveConsent({enabled:false,scopes:{status:false,details:false},selectedTokens:[],expectedVersion:active.consentVersion},active)]);
      expect(race[1].status,"Consent off must commit").toBe("fulfilled");
      expect(await getSql()`SELECT count(*)::int AS n FROM identification_check_ins WHERE group_id=${active.groupId}::uuid`).toEqual([{n:0}]);
      expect((await getCaregiverAccess("fixture-caregiver",active.groupId,"status")).kind).toBe("denied");
      const fresh=await getOwnerAccess(setupResult.request);expect(fresh.kind==="owner"&&fresh.managementOnly).toBe(true);expect(await ownerRecords(active)).toHaveLength(0);
    }
  },60000);
  it("retention hides old events immediately, cleanup expires consent and deletes owned data",async()=>{
    const token=await fixture(),setupResult=await setup(token),active=await enable(setupResult.owner,setupResult.request,token),invite=await createCaregiverInvite({scopes:{status:true}},active);await redeemCaregiverInvite(invite.code,"fixture-caregiver");
    await confirmIdentification(active.groupId,token,"EVENING",active);await getSql()`UPDATE identification_check_ins SET identified_at=now()-interval '8 days' WHERE group_id=${active.groupId}::uuid`;
    expect((await getCaregiverStatus("fixture-caregiver",active.groupId))[0].slots[0].state).toBe("NO_CHECK_IN");
    const sql=getSql();await sql.transaction(sharingCleanupStatements(sql,[active.groupId]));expect(await sql`SELECT count(*)::int AS n FROM identification_check_ins WHERE group_id=${active.groupId}::uuid`).toEqual([{n:0}]);
    await sql`UPDATE sharing_groups SET consent_expires_at=now()-interval '1 second' WHERE id=${active.groupId}::uuid`;
    expect((await getCaregiverAccess("fixture-caregiver",active.groupId,"status")).kind).toBe("denied");const expired=await getOwnerAccess(setupResult.request);expect(expired.kind==="owner"&&expired.managementOnly).toBe(true);
    await sql.transaction(sharingCleanupStatements(sql,[active.groupId]));expect((await ownerControls((await getOwnerAccess(setupResult.request)) as OwnerAccess))?.enabled).toBe(false);
  },30000);
  it("owner rotation is creator-bound and revokes prior code/sessions/access; expiry denied",async()=>{
    const token=await fixture(),setupResult=await setup(token),active=await enable(setupResult.owner,setupResult.request,token);
    await expect(rotateOwnerCode(active.groupId,"outsider")).rejects.toThrow("DENIED");
    const race=await Promise.allSettled([confirmIdentification(active.groupId,token,"EVENING",active),rotateOwnerCode(active.groupId,actor)]);
    expect(race[1].status).toBe("fulfilled");if(race[1].status!=="fulfilled")throw new Error("Rotation did not commit");const rotated=race[1].value;expect(rotated.ownerCode.length).toBe(43);
    expect(await getSql()`SELECT count(*)::int AS n FROM identification_check_ins WHERE group_id=${active.groupId}::uuid`).toEqual([{n:0}]);
    expect((await getOwnerAccess(setupResult.request)).kind).toBe("denied");expect(await insertOwnerSession(hashCredential(setupResult.code),hashCredential(newCredential()))).toBeNull();
    await getSql()`UPDATE sharing_groups SET owner_code_expires_at=now()-interval '1 second' WHERE id=${active.groupId}::uuid`;
    expect(await insertOwnerSession(hashCredential(rotated.ownerCode),hashCredential(newCredential()))).toBeNull();
  },30000);
  it("durable exchange limit merges concurrent attempts, removed grant denies status",async()=>{
    const hash=hashCredential(newCredential());buckets.add(hash);const attempts=await Promise.all(Array.from({length:8},()=>reserveOwnerAttempt(hash)));expect(attempts.filter(Boolean)).toHaveLength(5);
    const token=await fixture(),setupResult=await setup(token),active=await enable(setupResult.owner,setupResult.request,token),invite=await createCaregiverInvite({scopes:{status:true}},active);await redeemCaregiverInvite(invite.code,"fixture-caregiver");
    const controls=await ownerControls(active);expect(!!controls?.grants[0]).toBe(true);expect(await revokeCaregiverGrant(active,controls!.grants[0].id)).toBe(true);expect((await getCaregiverAccess("fixture-caregiver",active.groupId,"status")).kind).toBe("denied");
  },30000);
  it("unclassified and as-needed slots have no scheduled pending state and accept only their stored slot",async()=>{
    for(const slot of ["UNCLASSIFIED","AS_NEEDED"] as const){const token=await fixture("2099-12",slot==="UNCLASSIFIED"?[]:[slot]),setupResult=await setup(token),active=await enable(setupResult.owner,setupResult.request,token),invite=await createCaregiverInvite({scopes:{status:true}},active);
      await redeemCaregiverInvite(invite.code,"fixture-caregiver");expect((await getCaregiverStatus("fixture-caregiver",active.groupId))[0].slots[0].state).toBe("OPTIONAL");
      await expect(confirmIdentification(active.groupId,token,"EVENING",active)).rejects.toThrow("DENIED");expect((await confirmIdentification(active.groupId,token,slot,active)).outcome).toBe("CURRENT_LABEL");
      expect((await getCaregiverStatus("fixture-caregiver",active.groupId))[0].slots[0].state).toBe("SHARED");
    }
  },30000);
  it("expired owner sessions cannot mutate using a previously granted access object",async()=>{
    const token=await fixture(),setupResult=await setup(token),active=await enable(setupResult.owner,setupResult.request,token);
    await getSql()`UPDATE sharing_owner_sessions SET expires_at=now()-interval '1 second' WHERE id=${active.sessionId}::uuid AND group_id=${active.groupId}::uuid`;
    expect((await getOwnerAccess(setupResult.request)).kind).toBe("denied");await expect(confirmIdentification(active.groupId,token,"EVENING",active)).rejects.toThrow("DENIED");
    await expect(saveConsent({enabled:false,scopes:{status:false,details:false},selectedTokens:[],expectedVersion:active.consentVersion},active)).rejects.toThrow("CONFLICT");
  },30000);
  it.skipIf(!process.env.MEDOT_PHASE5_HTTP_ORIGIN)("real production owner HTTP: code/cookie, explicit opt-in/check-in/off, private denial",async()=>{
    const token=await fixture(),setupResult=await setup(token),origin=process.env.MEDOT_PHASE5_HTTP_ORIGIN!;
    const ip="192.0.2.33";buckets.add(createHmac("sha256",process.env.SHARING_RATE_LIMIT_SECRET!).update(ip).digest("hex"));
    const post=(path:string,body:unknown,cookie="",requestOrigin="https://medot-smoke.example")=>fetch(origin+path,{method:"POST",headers:{"Content-Type":"application/json",origin:requestOrigin,cookie,"X-Forwarded-For":ip},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
    const exchange=await post("/api/sharing/session",{code:setupResult.code});expect(exchange.status).toBe(200);const cookie=(exchange.headers.get("set-cookie")??"").split(";")[0];expect(cookie.startsWith("medot_owner=")).toBe(true);
    const controls=await fetch(origin+"/api/sharing/consent",{headers:{cookie}});expect(controls.status).toBe(200);const before=await controls.json();expect(before.enabled).toBe(false);
    expect((await post("/api/sharing/check-ins",{token,slot:"EVENING"},cookie)).status).toBe(403);
    const enabled=await post("/api/sharing/consent",{enabled:true,scopes:{status:true,details:false},selectedTokens:[token],expectedVersion:before.version},cookie);expect(enabled.status).toBe(200);const active=await enabled.json();
    expect((await post("/api/sharing/check-ins",{token,slot:"EVENING"},cookie,"https://outsider.example")).status).toBe(403);
    const shared=await post("/api/sharing/check-ins",{token,slot:"EVENING"},cookie);expect(shared.status).toBe(200);expect(shared.headers.get("cache-control")).toContain("no-store");
    expect((await post("/api/sharing/consent",{enabled:false,scopes:{status:false,details:false},selectedTokens:[],expectedVersion:active.version},cookie)).status).toBe(200);
    expect((await fetch(origin+"/api/sharing/owner-records",{headers:{cookie}})).status).toBe(403);
    expect((await post("/api/sharing/check-ins",{token,slot:"EVENING"},cookie)).status).toBe(403);
    expect(await getSql()`SELECT count(*)::int AS n FROM identification_check_ins WHERE group_id=${setupResult.owner.groupId}::uuid`).toEqual([{n:0}]);
    expect((await fetch(origin+"/api/caregiver/groups")).status).toBe(401);
  },30000);
});
