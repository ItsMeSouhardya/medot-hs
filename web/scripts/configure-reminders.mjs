import nextEnv from "@next/env";
import { readFile,appendFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import webPush from "web-push";
nextEnv.loadEnvConfig(process.cwd());
const envFile=new URL("../.env.local",import.meta.url);
const existing=await readFile(envFile,"utf8").catch(()=>"");
const keys=webPush.generateVAPIDKeys();
const values={VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:"https://github.com/ItsMeSouhardya/medot-hs",REMINDER_CRON_SECRET:randomBytes(32).toString("base64url")};
const missing=Object.entries(values).filter(([name])=>!new RegExp(`^${name}=`,"m").test(existing));
if(missing.some(([name])=>name.includes("VAPID")&&name.endsWith("KEY"))&&missing.filter(([name])=>name.endsWith("KEY")).length!==2){
  console.error("Both VAPID keys must be configured as a matching pair. Existing values were preserved.");process.exit(1);
}
if(missing.length)await appendFile(envFile,"\n# Device reminders: server credentials, generated locally\n"+missing.map(([name,value])=>`${name}=${value}`).join("\n")+"\n");
console.log(`Reminder configuration: ${missing.length} missing values added to ignored .env.local. No values printed; no deployment or scheduler created.`);
