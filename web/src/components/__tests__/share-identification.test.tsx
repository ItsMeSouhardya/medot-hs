// @vitest-environment jsdom
import { afterEach,expect,it,vi } from "vitest";
import { cleanup,fireEvent,render,screen,waitFor } from "@testing-library/react";
import ShareIdentification from "../patient/share-identification";
const token="abcdefghijklmnopqrstuv";
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("opening makes no events; an enrolled owner must confirm sharing",async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>[{token,record:{usageSlots:["EVENING"]}}]}).mockResolvedValueOnce({ok:true,json:async()=>({outcome:"CURRENT_LABEL"})});vi.stubGlobal("fetch",fetcher);
  render(<ShareIdentification token={token} language="en" />);
  const button=await screen.findByRole("button",{name:"Share that I identified this medicine"});
  expect(fetcher.mock.calls.every(call=>!call[1]?.method)).toBe(true);
  fireEvent.click(button);expect(fetcher).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button",{name:"Confirm sharing"}));
  await screen.findByText("Identification shared. This does not confirm a dose was taken.");
  expect(fetcher.mock.calls[1][1].method).toBe("POST");expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({token,slot:"EVENING"});
});
it("denied owner lookup hides the action and never posts",async()=>{
  const fetcher=vi.fn().mockResolvedValue({ok:false});vi.stubGlobal("fetch",fetcher);render(<ShareIdentification token={token} language="en" />);
  await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1));expect(screen.queryByRole("button")).toBeNull();
});
