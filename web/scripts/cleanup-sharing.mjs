import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import { sharingCleanupStatements } from "./sharing-cleanup.mjs";
nextEnv.loadEnvConfig(process.cwd());
try{
  if(!process.env.DATABASE_URL)throw new Error("missing");
  const sql=neon(process.env.DATABASE_URL),results=await sql.transaction(sharingCleanupStatements(sql));
  console.log(JSON.stringify({expiredGroups:results[0][0]?.count??0,deletedRows:results.slice(1).map(rows=>rows.length)}));
}catch{console.error("Sharing cleanup failed. Check server configuration; no credentials are logged.");process.exitCode=1;}
