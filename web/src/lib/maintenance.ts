import { getSql } from "./db";
import { cronAuthorized } from "./reminders/security";
import { privateHandler,privateJson } from "./caregiver/http";
import { SharingError } from "./caregiver/types";
import { sharingCleanupStatements } from "../../scripts/sharing-cleanup.mjs";

// Machine-only maintenance: browser sessions and owner codes are insufficient.
export function sharingCleanup(request:Request):Promise<Response> {
  return privateHandler(async()=>{
    if(!cronAuthorized(request))throw new SharingError("DENIED");
    const sql=getSql(),results=await sql.transaction(sharingCleanupStatements(sql));
    return privateJson({expiredGroups:results[0][0]?.count??0,deletedRows:results.slice(1).map(rows=>rows.length)});
  });
}
