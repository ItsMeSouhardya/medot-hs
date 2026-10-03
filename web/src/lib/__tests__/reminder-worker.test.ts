import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect,it,vi } from "vitest";
import { notificationPayload } from "../reminders/domain";
function worker(){
  const listeners:Record<string,(event:unknown)=>void>={},show=vi.fn(async()=>{}),open=vi.fn(async()=>{});
  runInNewContext(readFileSync("public/sw.js","utf8"),{URL,self:{addEventListener:(name:string,handler:(event:unknown)=>void)=>{listeners[name]=handler;},location:{origin:"https://medot.example"},registration:{showNotification:show},clients:{matchAll:async()=>[],openWindow:open}}});
  return {listeners,show,open};
}
it.each(["en","bn","hi"] as const)("shows generic reviewed %s message and never stores medicine content",async language=>{
  const {listeners,show}=worker();let task:Promise<unknown>|undefined;listeners.push({data:{json:()=>({language,title:"private dose",body:"private instructions",url:"https://outsider.example"})},waitUntil:(promise:Promise<unknown>)=>{task=promise;}});await task;
  const [title,options]=show.mock.calls[0] as unknown as [string,{body:string;data:{url:string}}];const expected=notificationPayload(language);expect(title).toBe(expected.title);expect(options.body).toBe(expected.body);expect(options.data.url).toBe("/reminders");
});
it("always opens same-origin reminder controls even with a malicious payload URL",async()=>{
  const {listeners,open}=worker();let task:Promise<unknown>|undefined;listeners.notificationclick({notification:{data:{url:"https://outsider.example"},close:vi.fn()},waitUntil:(promise:Promise<unknown>)=>{task=promise;}});await task;expect(open).toHaveBeenCalledWith("https://medot.example/reminders");
});
