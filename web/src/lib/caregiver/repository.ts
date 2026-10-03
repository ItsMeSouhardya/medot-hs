import { randomUUID } from "node:crypto";
import { getSql } from "../db";
import { projectTagDetails,type PublicRecord,type TagDetailsRow } from "../tag-repository";
import type { CaregiverGrantRow,ConsentInput,OwnerAccess,OwnerControls,OwnerRecord,OwnerSessionRow } from "./types";

// Every write rechecks server session/version. These constant SQL fragments
// contain no request text; all input remains bound parameters.
const ownerGuard=`g.id=$1::uuid AND g.consent_version=$3::integer AND EXISTS (
  SELECT 1 FROM sharing_owner_sessions s WHERE s.id=$2::uuid AND s.group_id=g.id
  AND s.consent_version=g.consent_version AND s.expires_at>clock_timestamp() AND s.revoked_at IS NULL)`;
const activeConsent=`g.enabled AND g.scope_status AND g.consent_expires_at>clock_timestamp()`;
const sharingOwner=`${ownerGuard} AND ${activeConsent} AND EXISTS (
  SELECT 1 FROM sharing_owner_sessions s WHERE s.id=$2::uuid AND NOT s.management_only)`;
const caregiverGuard=`cg.clerk_user_id=$1 AND g.id=$2::uuid AND cg.group_id=g.id
  AND cg.revoked_at IS NULL AND cg.consent_version=g.consent_version AND cg.scope_status AND ${activeConsent}`;
const ownerParams=(owner:OwnerAccess)=>[owner.groupId,owner.sessionId,owner.consentVersion];
export async function lookupOwnerSession(hash:string):Promise<OwnerSessionRow|null>{
  const sql=getSql();const rows=await sql`SELECT g.id AS "groupId",s.id AS "sessionId",s.consent_version AS "sessionVersion",
    g.consent_version AS "groupVersion",s.expires_at::text AS "sessionExpiresAt",s.revoked_at IS NOT NULL AS "sessionRevoked",
    s.management_only AS "managementOnly",g.enabled,g.consent_expires_at::text AS "consentExpiresAt"
    FROM sharing_owner_sessions s JOIN sharing_groups g ON g.id=s.group_id WHERE s.credential_hash=${hash} LIMIT 1`;
  return (rows[0] as OwnerSessionRow|undefined)??null;
}
export async function lookupCaregiverGrant(userId:string,groupId:string):Promise<CaregiverGrantRow|null>{
  const sql=getSql();const rows=await sql`SELECT g.id AS "groupId",cg.clerk_user_id AS "userId",
    g.consent_version AS "consentVersion",cg.consent_version AS "grantVersion",g.enabled,g.scope_status AS status,
    g.scope_details AS details,cg.scope_status AS "grantStatus",cg.scope_details AS "grantDetails",
    g.consent_expires_at::text AS "expiresAt",cg.revoked_at IS NOT NULL AS revoked
    FROM caregiver_grants cg JOIN sharing_groups g ON g.id=cg.group_id
    WHERE cg.clerk_user_id=${userId} AND g.id=${groupId} AND cg.revoked_at IS NULL LIMIT 1`;
  return (rows[0] as CaregiverGrantRow|undefined)??null;
}
export async function reserveOwnerAttempt(bucketHash:string):Promise<boolean>{
  const sql=getSql();const rows=await sql`INSERT INTO sharing_exchange_throttle(bucket_hash,window_start,attempts)
    VALUES(${bucketHash},to_timestamp(floor(extract(epoch FROM now())/600)*600),1)
    ON CONFLICT(bucket_hash,window_start) DO UPDATE SET attempts=sharing_exchange_throttle.attempts+1
    WHERE sharing_exchange_throttle.attempts<5 RETURNING attempts`;
  return rows.length===1;
}
export async function insertOwnerSession(codeHash:string,credentialHash:string):Promise<string|null>{
  const sql=getSql();const results=await sql.transaction([
    sql`SELECT id FROM sharing_groups WHERE owner_code_hash=${codeHash} AND owner_code_expires_at>clock_timestamp() FOR UPDATE`,
    sql`INSERT INTO sharing_owner_sessions(id,group_id,credential_hash,consent_version,expires_at,management_only)
      SELECT ${randomUUID()}::uuid,g.id,${credentialHash},g.consent_version,clock_timestamp()+interval '12 hours',
        NOT(g.enabled AND g.scope_status AND g.consent_expires_at>clock_timestamp())
      FROM sharing_groups g WHERE g.owner_code_hash=${codeHash} AND g.owner_code_expires_at>clock_timestamp()
      RETURNING group_id::text AS id`,
  ]);return (results[1][0]?.id as string|undefined)??null;
}
export async function insertSharingGroup(actor:string,tokens:string[],codeHash:string):Promise<string|null>{
  const sql=getSql(),id=randomUUID();const results=await sql.transaction([
    sql`SELECT token FROM tags WHERE token=ANY(${tokens}::text[]) FOR SHARE`,
    sql`INSERT INTO sharing_groups(id,created_by,owner_code_hash,owner_code_expires_at)
      SELECT ${id}::uuid,${actor},${codeHash},clock_timestamp()+interval '30 days'
      WHERE (SELECT count(*) FROM tags WHERE token=ANY(${tokens}::text[]) AND status='ACTIVE')=${tokens.length}
      RETURNING id::text`,
    sql`INSERT INTO sharing_members(group_id,token,alias)
      SELECT g.id,u.token,'Strip '||u.ordinality FROM sharing_groups g,
        unnest(${tokens}::text[]) WITH ORDINALITY AS u(token,ordinality) WHERE g.id=${id}::uuid`,
  ]);return (results[1][0]?.id as string|undefined)??null;
}
export async function listSharingGroups(actor:string){
  const sql=getSql();return await sql`SELECT g.id,g.enabled,g.consent_expires_at::text AS "expiresAt",count(sm.token)::int AS count
    FROM sharing_groups g JOIN sharing_members sm ON sm.group_id=g.id WHERE g.created_by=${actor}
    GROUP BY g.id ORDER BY g.created_at DESC LIMIT 20` as {id:string;enabled:boolean;expiresAt:string|null;count:number}[];
}
export async function atomicConsent(owner:OwnerAccess,input:ConsentInput):Promise<{version:number}|null>{
  const sql=getSql(),params=[...ownerParams(owner),input.enabled,input.scopes.status,input.scopes.details,input.selectedTokens];
  // CTE side effects depend on changed, so a stale failed update cannot erase
  // grants/events from a different successful consent transaction.
  // Acquire the group lock in its own statement first. Under READ COMMITTED,
  // the following CTE gets a fresh snapshot containing check-ins committed
  // while the lock was waiting; one UPDATE/DELETE CTE alone cannot do that.
  const results=await sql.transaction([
    sql`SELECT id FROM sharing_groups WHERE id=${owner.groupId}::uuid FOR UPDATE`,
    sql`SELECT token FROM tags WHERE token=ANY(${input.selectedTokens}::text[]) FOR SHARE`,
    sql.query(`WITH changed AS (
    UPDATE sharing_groups g SET enabled=$4,scope_status=$5,scope_details=$6,
      consent_expires_at=CASE WHEN $4 THEN clock_timestamp()+interval '30 days' ELSE NULL END,
      consent_version=g.consent_version+1 WHERE ${ownerGuard}
      AND (NOT $4 OR ((SELECT count(*) FROM sharing_members sm JOIN tags t ON t.token=sm.token
        WHERE sm.group_id=g.id AND sm.token=ANY($7::text[]) AND t.status='ACTIVE')=cardinality($7::text[])))
      RETURNING g.id,g.consent_version),
    members AS (UPDATE sharing_members sm SET selected=($4 AND sm.token=ANY($7::text[])) FROM changed c WHERE sm.group_id=c.id RETURNING sm.token),
    invitations AS (DELETE FROM caregiver_invites i USING changed c WHERE i.group_id=c.id RETURNING i.id),
    grants AS (DELETE FROM caregiver_grants cg USING changed c WHERE cg.group_id=c.id RETURNING cg.id),
    events AS (DELETE FROM identification_check_ins ci USING changed c WHERE ci.group_id=c.id RETURNING ci.token),
    old_sessions AS (DELETE FROM sharing_owner_sessions s USING changed c WHERE s.group_id=c.id AND s.id<>$2::uuid RETURNING s.id),
    current_session AS (UPDATE sharing_owner_sessions s SET consent_version=c.consent_version,management_only=NOT $4
      FROM changed c WHERE s.group_id=c.id AND s.id=$2::uuid RETURNING s.id)
    SELECT consent_version AS version FROM changed`,params),
  ]);
  return (results[2][0] as {version:number}|undefined)??null;
}
export async function rotateOwnerCredential(groupId:string,actor:string,codeHash:string):Promise<boolean>{
  const sql=getSql();const results=await sql.transaction([
    sql`SELECT id FROM sharing_groups WHERE id=${groupId}::uuid AND created_by=${actor} FOR UPDATE`,
    sql.query(`WITH changed AS (
    UPDATE sharing_groups SET owner_code_hash=$3,owner_code_expires_at=clock_timestamp()+interval '30 days',
      enabled=false,scope_status=false,scope_details=false,consent_expires_at=NULL,consent_version=consent_version+1
    WHERE id=$1::uuid AND created_by=$2 RETURNING id),
    sessions AS(DELETE FROM sharing_owner_sessions s USING changed c WHERE s.group_id=c.id RETURNING s.id),
    invites AS(DELETE FROM caregiver_invites i USING changed c WHERE i.group_id=c.id RETURNING i.id),
    grants AS(DELETE FROM caregiver_grants cg USING changed c WHERE cg.group_id=c.id RETURNING cg.id),
    events AS(DELETE FROM identification_check_ins ci USING changed c WHERE ci.group_id=c.id RETURNING ci.token),
    members AS(UPDATE sharing_members sm SET selected=false FROM changed c WHERE sm.group_id=c.id RETURNING sm.token)
    SELECT id FROM changed`,[groupId,actor,codeHash]),
  ]);return results[1].length===1;
}
export async function ownerControls(owner:OwnerAccess):Promise<OwnerControls|null>{
  const sql=getSql();const rows=await sql.query(`SELECT g.id AS "groupId",(${activeConsent}) AS enabled,g.consent_version AS version,
    json_build_object('status',g.scope_status,'details',g.scope_details) AS scopes,g.consent_expires_at::text AS "expiresAt",
    (SELECT coalesce(json_agg(json_build_object('token',sm.token,'alias',sm.alias,'selected',sm.selected) ORDER BY sm.alias),'[]'::json)
      FROM sharing_members sm WHERE sm.group_id=g.id) AS members,
    (SELECT coalesce(json_agg(json_build_object('id',cg.id) ORDER BY cg.granted_at),'[]'::json)
      FROM caregiver_grants cg WHERE cg.group_id=g.id AND cg.revoked_at IS NULL AND cg.consent_version=g.consent_version) AS grants
    FROM sharing_groups g WHERE ${ownerGuard}`,[...ownerParams(owner)]);
  return (rows[0] as OwnerControls|undefined)??null;
}
export async function insertCaregiverInvite(owner:OwnerAccess,scopes:{status:boolean;details:boolean},hash:string):Promise<boolean>{
  const sql=getSql();const results=await sql.transaction([
    sql`SELECT id FROM sharing_groups WHERE id=${owner.groupId}::uuid FOR UPDATE`,
    sql.query(`INSERT INTO caregiver_invites(id,group_id,secret_hash,scope_status,scope_details,consent_version,expires_at)
      SELECT $4::uuid,g.id,$5,true,$6,g.consent_version,clock_timestamp()+interval '24 hours' FROM sharing_groups g
      WHERE ${sharingOwner} AND (NOT $6 OR g.scope_details) RETURNING id`,[...ownerParams(owner),randomUUID(),hash,scopes.details]),
  ]);return results[1].length===1;
}
export async function claimCaregiverInvite(hash:string,userId:string):Promise<string|null>{
  const sql=getSql();const results=await sql.transaction([
    sql`SELECT g.id FROM sharing_groups g JOIN caregiver_invites i ON i.group_id=g.id WHERE i.secret_hash=${hash} FOR UPDATE OF g`,
    sql`WITH claimed AS(UPDATE caregiver_invites i SET redeemed_at=clock_timestamp(),redeemed_by=${userId}
      FROM sharing_groups g WHERE i.secret_hash=${hash} AND i.group_id=g.id AND i.redeemed_at IS NULL AND i.expires_at>clock_timestamp()
        AND g.enabled AND g.scope_status AND g.consent_expires_at>clock_timestamp() AND i.consent_version=g.consent_version
        AND i.scope_status AND (NOT i.scope_details OR g.scope_details) RETURNING i.*)
      INSERT INTO caregiver_grants(id,group_id,clerk_user_id,scope_status,scope_details,consent_version)
      SELECT ${randomUUID()}::uuid,c.group_id,${userId},c.scope_status,c.scope_details,c.consent_version FROM claimed c
      ON CONFLICT(group_id,clerk_user_id) WHERE revoked_at IS NULL DO UPDATE
        SET scope_status=EXCLUDED.scope_status,scope_details=EXCLUDED.scope_details,consent_version=EXCLUDED.consent_version
      RETURNING group_id::text AS id`,
  ]);return (results[1][0]?.id as string|undefined)??null;
}
export async function revokeCaregiverGrant(owner:OwnerAccess,grantId:string):Promise<boolean>{
  const sql=getSql();const results=await sql.transaction([
    sql`SELECT id FROM sharing_groups WHERE id=${owner.groupId}::uuid FOR UPDATE`,
    sql.query(`WITH changed AS(UPDATE caregiver_grants cg SET revoked_at=clock_timestamp()
    FROM sharing_groups g WHERE cg.id=$4::uuid AND cg.group_id=g.id AND ${ownerGuard} AND cg.revoked_at IS NULL RETURNING cg.group_id),
    invites AS(DELETE FROM caregiver_invites i USING changed c WHERE i.group_id=c.group_id RETURNING i.id)
    SELECT group_id FROM changed`,[...ownerParams(owner),grantId]),
  ]);return results[1].length===1;
}
export async function atomicCheckIn(owner:OwnerAccess,token:string,slot:string):Promise<{day:string;outcome:"CURRENT_LABEL"|"EXPIRED_LABEL"}|null>{
  const sql=getSql();const results=await sql.transaction([
    sql`SELECT id FROM sharing_groups WHERE id=${owner.groupId}::uuid FOR UPDATE`,
    sql`SELECT token FROM tags WHERE token=${token} FOR SHARE`,
    sql.query(`WITH event_time AS MATERIALIZED(SELECT clock_timestamp() AS at)
      INSERT INTO identification_check_ins(group_id,token,slot,day,outcome,identified_at)
      SELECT g.id,t.token,$5,(event_time.at AT TIME ZONE 'Asia/Kolkata')::date,
        CASE WHEN event_time.at>=(((t.expiry_month||'-01')::date+interval '1 month') AT TIME ZONE 'Asia/Kolkata') THEN 'EXPIRED_LABEL' ELSE 'CURRENT_LABEL' END,event_time.at
      FROM sharing_groups g JOIN sharing_members sm ON sm.group_id=g.id JOIN tags t ON t.token=sm.token CROSS JOIN event_time
      WHERE ${sharingOwner} AND sm.selected AND t.token=$4 AND t.status='ACTIVE'
        AND ($5=ANY(t.usage_slots) OR ($5='UNCLASSIFIED' AND cardinality(t.usage_slots)=0))
      ON CONFLICT(group_id,token,slot,day) DO UPDATE SET outcome=EXCLUDED.outcome
      RETURNING day::text,outcome`,[...ownerParams(owner),token,slot]),
  ]);return (results[2][0] as {day:string;outcome:"CURRENT_LABEL"|"EXPIRED_LABEL"}|undefined)??null;
}
type RecordRow=TagDetailsRow&{token:string;generic_name:string;strength:string;dosage_form:string;batch_number:string;expiry_month:string;instruction:string;instruction_bn?:string|null;instruction_hi?:string|null;brand_name?:string|null};
function publicRecord(row:RecordRow):PublicRecord{return {token:row.token,genericName:row.generic_name,strength:row.strength,dosageForm:row.dosage_form,batchNumber:row.batch_number,expiryMonth:row.expiry_month,instruction:row.instruction,
  ...projectTagDetails(row),...(row.brand_name?{brandName:row.brand_name}:{}),...(row.instruction_bn?{instructionBn:row.instruction_bn}:{}),...(row.instruction_hi?{instructionHi:row.instruction_hi}:{})};}
const recordColumns=`t.token,t.medicine_id,t.batch_number,t.expiry_month,t.instruction,t.instruction_bn,t.instruction_hi,
  t.usage_slots,t.created_at,t.activated_at,t.verified_at,t.verification_version,m.generic_name,m.strength,m.dosage_form,
  m.brand_name,m.record_kind,m.info_en,m.info_bn,m.info_hi`;
export async function ownerRecords(owner:OwnerAccess):Promise<OwnerRecord[]>{
  const sql=getSql();const rows=await sql.query(`SELECT sm.alias,${recordColumns} FROM sharing_groups g
    JOIN sharing_members sm ON sm.group_id=g.id JOIN tags t ON t.token=sm.token JOIN medicines m ON m.id=t.medicine_id
    WHERE ${sharingOwner} AND sm.selected AND t.status='ACTIVE' ORDER BY sm.alias LIMIT 5`,ownerParams(owner));
  return (rows as (RecordRow&{alias:string})[]).map(row=>({token:row.token,alias:row.alias,record:publicRecord(row)}));
}
export type StatusRow={alias:string;internalToken:string;available:boolean;verificationVersion:number|null;verifiedAt:string|null;usageSlots:string[];events:{slot:string;day:string;identifiedAt:string;outcome:"CURRENT_LABEL"|"EXPIRED_LABEL"}[];record?:PublicRecord};
export async function caregiverStatusRows(userId:string,groupId:string,details:boolean):Promise<StatusRow[]>{
  const sql=getSql();const rows=await sql.query(`SELECT sm.alias,t.token AS "internalToken",t.status='ACTIVE' AS available,
    t.verification_version AS "verificationVersion",t.verified_at::text AS "verifiedAt",t.usage_slots AS "usageSlots",
    (SELECT coalesce(json_agg(json_build_object('slot',ci.slot,'day',ci.day::text,'identifiedAt',ci.identified_at::text,'outcome',ci.outcome)),'[]'::json)
      FROM identification_check_ins ci WHERE ci.group_id=g.id AND ci.token=t.token AND t.status='ACTIVE'
        AND ci.identified_at>clock_timestamp()-interval '7 days') AS events
    FROM sharing_groups g JOIN caregiver_grants cg ON cg.group_id=g.id JOIN sharing_members sm ON sm.group_id=g.id
      JOIN tags t ON t.token=sm.token WHERE ${caregiverGuard} AND sm.selected ORDER BY sm.alias LIMIT 5`,[userId,groupId]);
  const statuses=rows as StatusRow[];
  if(details){const records=await sql.query(`SELECT ${recordColumns} FROM sharing_groups g JOIN caregiver_grants cg ON cg.group_id=g.id
    JOIN sharing_members sm ON sm.group_id=g.id JOIN tags t ON t.token=sm.token JOIN medicines m ON m.id=t.medicine_id
    WHERE ${caregiverGuard} AND cg.scope_details AND g.scope_details AND sm.selected AND t.status='ACTIVE' LIMIT 5`,[userId,groupId]);
    const mapped=new Map((records as RecordRow[]).map(row=>[row.token,publicRecord(row)]));
    for(const row of statuses)if(row.available)row.record=mapped.get(row.internalToken);
  }return statuses;
}
export async function caregiverGroups(userId:string):Promise<{id:string}[]>{
  const sql=getSql();const rows=await sql`SELECT g.id FROM sharing_groups g JOIN caregiver_grants cg ON cg.group_id=g.id
    WHERE cg.clerk_user_id=${userId} AND cg.revoked_at IS NULL AND cg.consent_version=g.consent_version AND cg.scope_status
      AND g.enabled AND g.scope_status AND g.consent_expires_at>clock_timestamp() ORDER BY cg.granted_at DESC LIMIT 10`;
  return rows as {id:string}[];
}
export async function activeSharedTokens(userId:string,groupId:string):Promise<string[]>{
  const sql=getSql();const rows=await sql.query(`SELECT t.token FROM sharing_groups g JOIN caregiver_grants cg ON cg.group_id=g.id
    JOIN sharing_members sm ON sm.group_id=g.id JOIN tags t ON t.token=sm.token
    WHERE ${caregiverGuard} AND sm.selected AND t.status='ACTIVE' LIMIT 5`,[userId,groupId]);
  return rows.map(row=>row.token as string);
}
