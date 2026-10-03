// @vitest-environment jsdom
import { afterEach,expect,it,vi } from "vitest";
import { cleanup,fireEvent,render,screen,waitFor } from "@testing-library/react";
import CaregiverDashboard from "../caregiver/dashboard";
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const groups=[{id:"fixture",statuses:[{alias:"Strip 1",available:true,pairingVerified:false,slots:[{slot:"EVENING",state:"NO_CHECK_IN"}]}]}];
it("clears private state on hide/denial and ignores a late read after cancellation",async()=>{
  let late:(value:unknown)=>void=()=>{};const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>groups}).mockImplementationOnce(()=>new Promise(resolve=>{late=resolve;})).mockResolvedValue({ok:false});vi.stubGlobal("fetch",fetcher);
  render(<CaregiverDashboard/>);await screen.findByText(/No check-in shared today/);
  fireEvent(window,new Event("focus"));await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2));fireEvent(window,new Event("blur"));expect(screen.queryByText("No check-in shared today")).toBeNull();
  late({ok:true,json:async()=>groups});await new Promise(resolve=>setTimeout(resolve,0));expect(screen.queryByText("No check-in shared today")).toBeNull();
  fireEvent(window,new Event("focus"));await screen.findByRole("alert");expect(screen.queryByText("No check-in shared today")).toBeNull();
});
