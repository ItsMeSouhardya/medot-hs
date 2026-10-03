import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";
import { mkdirSync,writeFileSync } from "node:fs";
// Explicit opt-in. Never activates real strips or calls a voice provider.
if(process.env.MEDOT_RUN_PHASE5_DB_TESTS!=="1"){console.error("Set MEDOT_RUN_PHASE5_DB_TESTS=1 for owned fictional database checks.");process.exitCode=1;}
else{
  nextEnv.loadEnvConfig(process.cwd());
  const result=spawnSync("rtk",["proxy","npm.cmd","test","--","--no-file-parallelism","tests/integration/phase5-database.test.ts"],{cwd:process.cwd(),env:process.env,encoding:"utf8",timeout:240000});
  let output=(result.stdout??"")+(result.stderr??"");for(const [name,value]of Object.entries(process.env))if(/KEY|SECRET|URL|TOKEN/.test(name)&&value?.length>=8)output=output.split(value).join("[REDACTED]");
  output=output.replace(/(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])/g,"[PRIVATE_CODE]");
  const directory=new URL("../../.superpowers/sdd/2026-10-02-medot-feature-expansion/",import.meta.url);mkdirSync(directory,{recursive:true});
  const target=new URL("e7-live.log",directory);writeFileSync(target,output);
  console.log("Phase 5 SQL exit",result.status??1);console.log(output.split("\n").filter(line=>/Test Files|Tests |FAIL|Error/.test(line)).join("\n"));process.exitCode=result.status??1;
}
