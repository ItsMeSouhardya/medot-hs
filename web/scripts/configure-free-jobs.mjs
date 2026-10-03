// Operator-only free cron-job.org setup. Never logs keys, headers or responses.
import nextEnv from "@next/env";
import { setTimeout as delay } from "node:timers/promises";
nextEnv.loadEnvConfig(process.cwd());
try {
  if(process.argv.slice(2).some(arg=>arg!=="--apply"))throw new Error();
  const origin=new URL(process.env.RENDER_SERVICE_URL??process.env.APP_ORIGIN??"");
  if(origin.protocol!=="https:"||origin.username||origin.password||origin.pathname!=="/"||origin.search||origin.hash)throw new Error();
  const jobs=[
    {title:"MEDOT reminder dispatch",path:"/api/reminders/dispatch",hours:[-1],minutes:[-1]},
    {title:"MEDOT sharing cleanup",path:"/api/sharing/cleanup",hours:[0],minutes:[0]},
  ];
  if(!process.argv.includes("--apply")){
    console.log(JSON.stringify({apply:false,jobs:jobs.map(job=>({title:job.title,url:new URL(job.path,origin).href,schedule:job.minutes[0]===-1?"every minute":"daily 00:00 UTC"}))}));
  }else{
    const key=process.env.CRON_JOB_API_KEY,secret=process.env.REMINDER_CRON_SECRET;
    if(!key||!secret||secret.length<32)throw new Error();
    async function api(path,method="GET",body){
      const response=await fetch("https://api.cron-job.org"+path,{method,redirect:"error",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
      if(!response.ok){console.error(`Free scheduler API rejected: HTTP ${response.status}`);throw new Error();}
      return response.json();
    }
    const existing=await api("/jobs");if(existing.someFailed||!Array.isArray(existing.jobs))throw new Error();
    for(const definition of jobs){
      const url=new URL(definition.path,origin).href;
      const matches=existing.jobs.filter(job=>job.title===definition.title&&job.url===url);
      if(matches.length>1)throw new Error();
      const job={title:definition.title,url,enabled:true,saveResponses:false,requestMethod:1,requestTimeout:30,redirectSuccess:false,
        schedule:{timezone:"UTC",expiresAt:0,hours:definition.hours,minutes:definition.minutes,mdays:[-1],months:[-1],wdays:[-1]},
        extendedData:{headers:{Authorization:`Bearer ${secret}`},body:""}};
      const result=matches.length?await api(`/jobs/${matches[0].jobId}`,"PATCH",{job}):await api("/jobs","PUT",{job});
      const id=matches[0]?.jobId??result.jobId;
      if(!Number.isInteger(id))throw new Error();
      const verification=(await api(`/jobs/${id}`)).jobDetails;
      if(!verification?.enabled||verification.url!==url||verification.requestMethod!==1||verification.saveResponses!==false||verification.extendedData?.headers?.Authorization!==`Bearer ${secret}`)throw new Error();
      console.log(JSON.stringify({title:definition.title,jobId:id,action:matches.length?"updated":"created",verified:true}));
      await delay(1100);
    }
  }
}catch{
  console.error("Free scheduler setup unavailable. Check HTTPS service URL, private API key and scheduler secret. No private diagnostics are logged.");
  process.exitCode=1;
}
