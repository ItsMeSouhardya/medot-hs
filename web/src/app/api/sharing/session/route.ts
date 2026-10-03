import { boundedBody,privateHandler,privateJson,requireOrigin,ownerRequired } from "@/lib/caregiver/http";
import { exchangeOwnerCode,ownerCookie } from "@/lib/caregiver/session-exchange";
import { getSql } from "@/lib/db";
export const dynamic="force-dynamic";
export async function POST(request:Request){return privateHandler(async()=>{requireOrigin(request);const cookie=await exchangeOwnerCode(await boundedBody(request),request);return privateJson({ok:true},200,{"Set-Cookie":cookie});});}
export async function DELETE(request:Request){return privateHandler(async()=>{requireOrigin(request);const owner=await ownerRequired(request);const sql=getSql();await sql`DELETE FROM sharing_owner_sessions WHERE id=${owner.sessionId}::uuid AND group_id=${owner.groupId}::uuid`;return privateJson({ok:true},200,{"Set-Cookie":ownerCookie("",0)});});}
