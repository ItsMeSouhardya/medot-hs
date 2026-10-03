import { afterEach, expect, it, vi } from "vitest";
import { sharingCleanup } from "../maintenance";
const mocks=vi.hoisted(()=>({transaction:vi.fn(),sql:vi.fn()}));
vi.mock("../db",()=>({getSql:()=>Object.assign(mocks.sql,{query:mocks.sql,transaction:mocks.transaction})}));
const secret="fixture-scheduler-secret-at-least-32-characters";
const request=(authorization="")=>new Request("https://medot.example/api/sharing/cleanup",{method:"POST",headers:{authorization,cookie:"medot_owner=not-authority"}});
afterEach(()=>{vi.resetAllMocks();vi.unstubAllEnvs();});
it("denies absent, invalid or unconfigured scheduler credentials before SQL",async()=>{
  expect((await sharingCleanup(request())).status).toBe(403);
  vi.stubEnv("REMINDER_CRON_SECRET",secret);
  expect((await sharingCleanup(request("Bearer wrong"))).status).toBe(403);
  vi.stubEnv("REMINDER_CRON_SECRET","short");
  expect((await sharingCleanup(request("Bearer short"))).status).toBe(403);
  expect(mocks.sql).not.toHaveBeenCalled();expect(mocks.transaction).not.toHaveBeenCalled();
});
it("returns aggregate cleanup counts only for the authenticated scheduler",async()=>{
  vi.stubEnv("REMINDER_CRON_SECRET",secret);
  mocks.transaction.mockResolvedValue([[{count:2}], [{id:"private-row"}], []]);
  const response=await sharingCleanup(request(`Bearer ${secret}`));
  expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toContain("no-store");
  expect(await response.json()).toEqual({expiredGroups:2,deletedRows:[1,0]});
});
it("reports unavailable database without exposing private diagnostics",async()=>{
  vi.stubEnv("REMINDER_CRON_SECRET",secret);mocks.transaction.mockRejectedValue(new Error("private-connection"));
  const response=await sharingCleanup(request(`Bearer ${secret}`));
  expect(response.status).toBe(503);expect(await response.text()).not.toContain("private-connection");
});
