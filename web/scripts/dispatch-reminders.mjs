// Run once per minute from the deployed scheduler with server-only environment.
const origin=process.env.APP_ORIGIN,secret=process.env.REMINDER_CRON_SECRET;
try {
  const url=new URL(origin??"");
  if(url.protocol!=="https:"||url.username||url.password||url.pathname!=="/"||url.search||url.hash||!secret||secret.length<32)throw new Error();
  const response=await fetch(new URL("/api/reminders/dispatch",url),{method:"POST",redirect:"error",headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(55000)});
  if(!response.ok){console.error(`Reminder dispatch rejected: HTTP ${response.status}`);process.exitCode=1;}
  else {
    const counts=await response.json(),keys=["claimed","sent","skipped","failed"];
    if(!counts||keys.some(key=>!Number.isInteger(counts[key])||counts[key]<0||counts[key]>5)||counts.claimed!==counts.sent+counts.skipped+counts.failed)throw new Error();
    console.log(JSON.stringify(Object.fromEntries(keys.map(key=>[key,counts[key]]))));
    if(counts.failed>0)process.exitCode=1;
  }
} catch {console.error("Reminder dispatch unavailable. Check server origin, scheduler secret and connectivity.");process.exitCode=1;}
