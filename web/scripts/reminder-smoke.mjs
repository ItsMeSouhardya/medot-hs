import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";
import { mkdir,writeFile } from "node:fs/promises";
nextEnv.loadEnvConfig(process.cwd());
if(!process.env.DATABASE_URL){console.error("Reminder fixture check requires DATABASE_URL.");process.exit(1);}
const result=spawnSync(process.execPath,["node_modules/vitest/vitest.mjs","run","tests/integration/reminder-database.test.ts"],{cwd:process.cwd(),env:{...process.env,MEDOT_RUN_REMINDER_DB_TESTS:"1"},encoding:"utf8",timeout:180000});
let output=(result.stdout??"")+(result.stderr??"");
for(const [name,value] of Object.entries(process.env))if(value&&(name.includes("SECRET")||name.includes("KEY")||name==="DATABASE_URL"))output=output.split(value).join("[redacted]");
const directory=new URL("../../.superpowers/sdd/2026-10-02-medot-feature-expansion/",import.meta.url);
await mkdir(directory,{recursive:true});
await writeFile(new URL("reminder-db.log",directory),output);
console.log(output.split("\n").filter(line=>/Test Files|Tests |FAIL|Error:/.test(line)).join("\n"));
process.exitCode=result.status??1;
