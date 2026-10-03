import { afterEach,expect,it,vi } from "vitest";
import { projectStatus,getCaregiverStatus } from "../caregiver/status";
import type { StatusRow } from "../caregiver/repository";
const mocks=vi.hoisted(()=>({access:vi.fn(),rows:vi.fn(),active:vi.fn()}));
vi.mock("../caregiver/access",()=>({getCaregiverAccess:mocks.access}));vi.mock("../caregiver/repository",()=>({caregiverStatusRows:mocks.rows,activeSharedTokens:mocks.active}));
const now=new Date("2026-10-02T18:31:00Z"),row:StatusRow={alias:"Strip 1",internalToken:"abcdefghijklmnopqrstuv",available:true,verificationVersion:1,verifiedAt:"2026-10-01",usageSlots:["EVENING","AS_NEEDED"],events:[{slot:"EVENING",day:"2026-10-03",identifiedAt:now.toISOString(),outcome:"CURRENT_LABEL"}],record:{token:"abcdefghijklmnopqrstuv",genericName:"Private fixture",strength:"Fixture",dosageForm:"Fixture",batchNumber:"Fixture",expiryMonth:"2099-12",instruction:"Fixture"}};
afterEach(()=>vi.clearAllMocks());
it("status-only projection strips every medicine identity; Kolkata today changes at 18:30 UTC",()=>{
  const current=projectStatus(row,false,now);expect(Object.keys(current).sort()).toEqual(["alias","available","pairingVerified","slots"]);expect(current.slots[0].state).toBe("SHARED");expect(current.slots[1].state).toBe("OPTIONAL");
  expect(projectStatus(row,false,new Date("2026-10-02T18:29:00Z")).slots[0].state).toBe("NO_CHECK_IN");expect(projectStatus({...row,events:[{...row.events[0],identifiedAt:"2026-09-24T00:00:00Z"}]},false,now).slots[0].state).toBe("NO_CHECK_IN");
  expect(projectStatus({...row,available:false},true,now)).toEqual({alias:"Strip 1",available:false,pairingVerified:false,slots:[]});expect(projectStatus({...row,usageSlots:[],events:[]},false,now).slots[0].state).toBe("OPTIONAL");
});
it("denial or version change during a slow query prevents returning the private payload",async()=>{
  mocks.active.mockResolvedValue([row.internalToken]);
  mocks.access.mockResolvedValueOnce({kind:"denied"});await expect(getCaregiverStatus("user","group")).rejects.toThrow("DENIED");expect(mocks.rows).not.toHaveBeenCalled();
  mocks.access.mockResolvedValueOnce({kind:"granted",consentVersion:1,details:true}).mockResolvedValueOnce({kind:"granted",consentVersion:2,details:true});mocks.rows.mockResolvedValue([row]);await expect(getCaregiverStatus("user","group")).rejects.toThrow("DENIED");
});
it("a revocation observed after the details query suppresses the stale medicine",async()=>{
  mocks.access.mockResolvedValue({kind:"granted",consentVersion:1,details:true});mocks.rows.mockResolvedValue([row]);mocks.active.mockResolvedValue([]);
  expect(await getCaregiverStatus("user","group")).toEqual([{alias:"Strip 1",available:false,pairingVerified:false,slots:[]}]);
});
