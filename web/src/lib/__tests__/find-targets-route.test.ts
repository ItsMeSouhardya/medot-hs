import { afterEach,expect,it,vi } from "vitest";
vi.mock("../finder/demo-targets",()=>({getDemoFindTargets:vi.fn(async()=>[])}));
import { GET } from "../../app/api/public/find-targets/route";
afterEach(()=>vi.clearAllMocks());
it("missing demo configuration returns an empty uncached public target list",async()=>{
  const response=await GET();expect(response.status).toBe(200);expect(await response.json()).toEqual({targets:[]});expect(response.headers.get("cache-control")).toContain("no-store");
});
