// Optional scope is used only by bounded fixture tests. Production invokes
// the same statements without a scope. No tag/medicine/audio row is mutated.
/** @param {import('@neondatabase/serverless').NeonQueryFunction<false, false>} sql
 * @param {string[]|null} groupIds */
export function sharingCleanupStatements(sql,groupIds=null){
  const scope="($1::uuid[] IS NULL OR g.id=ANY($1::uuid[]))";
  return [
    sql.query(`WITH expired AS(UPDATE sharing_groups g SET enabled=false,scope_status=false,scope_details=false,
      consent_expires_at=NULL,consent_version=consent_version+1
      WHERE g.enabled AND g.consent_expires_at<=now() AND ${scope} RETURNING id,consent_version),
      sessions AS(UPDATE sharing_owner_sessions s SET management_only=true,consent_version=e.consent_version FROM expired e WHERE s.group_id=e.id RETURNING s.id),
      members AS(UPDATE sharing_members sm SET selected=false FROM expired e WHERE sm.group_id=e.id RETURNING sm.token),
      invites AS(DELETE FROM caregiver_invites i USING expired e WHERE i.group_id=e.id RETURNING i.id),
      grants AS(DELETE FROM caregiver_grants cg USING expired e WHERE cg.group_id=e.id RETURNING cg.id),
      events AS(DELETE FROM identification_check_ins ci USING expired e WHERE ci.group_id=e.id RETURNING ci.token)
      SELECT count(*)::int AS count FROM expired`,[groupIds]),
    sql.query(`DELETE FROM identification_check_ins ci USING sharing_groups g WHERE ci.group_id=g.id AND ${scope} AND (ci.identified_at<=now()-interval '7 days' OR NOT g.enabled OR g.consent_expires_at<=now()) RETURNING 1`,[groupIds]),
    sql.query(`DELETE FROM caregiver_invites i USING sharing_groups g WHERE i.group_id=g.id AND ${scope} AND (i.expires_at<=now() OR i.redeemed_at<=now()-interval '24 hours' OR i.consent_version<>g.consent_version OR NOT g.enabled) RETURNING 1`,[groupIds]),
    sql.query(`DELETE FROM caregiver_grants cg USING sharing_groups g WHERE cg.group_id=g.id AND ${scope} AND (cg.revoked_at IS NOT NULL OR cg.consent_version<>g.consent_version OR NOT g.enabled OR g.consent_expires_at<=now()) RETURNING 1`,[groupIds]),
    sql.query(`DELETE FROM sharing_owner_sessions s USING sharing_groups g WHERE s.group_id=g.id AND ${scope} AND (s.expires_at<=now() OR s.revoked_at IS NOT NULL) RETURNING 1`,[groupIds]),
    // Fixture cleanup does not touch unrelated rate-limit buckets.
    ...(groupIds===null?[sql`DELETE FROM sharing_exchange_throttle WHERE window_start<=now()-interval '10 minutes' RETURNING 1`]:[]),
  ];
}
