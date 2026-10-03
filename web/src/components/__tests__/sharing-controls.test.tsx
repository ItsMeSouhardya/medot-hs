// @vitest-environment jsdom
import { afterEach,expect,it,vi } from "vitest";
import { cleanup,render,screen,fireEvent,waitFor } from "@testing-library/react";
import SharingControls from "../caregiver/sharing-controls";
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("starts without automatic opt-in and clears the owner code after exchange",async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce({ok:false}).mockResolvedValueOnce({ok:true,json:async()=>({ok:true})}).mockResolvedValueOnce({ok:true,json:async()=>({groupId:"group",enabled:false,version:0,scopes:{status:false,details:false},expiresAt:null,members:[],grants:[]})});vi.stubGlobal("fetch",fetcher);
  render(<SharingControls />);await screen.findByLabelText("Owner control code");
  fireEvent.change(screen.getByLabelText("Owner control code"),{target:{value:"s".repeat(43)}});fireEvent.click(screen.getByRole("button",{name:"Unlock controls"}));
  await screen.findByText("Sharing is off");expect(fetcher.mock.calls.some(call=>call[0]==="/api/sharing/consent"&&call[1]?.method==="POST")).toBe(false);
  await waitFor(()=>expect(screen.queryByDisplayValue("s".repeat(43))).toBeNull());
});
it("explicit consent selects enrolled strips, defaults details off and supports immediate off",async()=>{
  let controls={groupId:"group",enabled:false,version:0,scopes:{status:false,details:false},expiresAt:null,members:[{token:"abcdefghijklmnopqrstuv",alias:"Strip 1",selected:false}],grants:[]};
  const fetcher=vi.fn(async (url:string,options?:RequestInit)=>{if(options?.method==="POST"&&url==="/api/sharing/consent"){const body=JSON.parse(String(options.body));controls={...controls,enabled:body.enabled,version:controls.version+1,scopes:body.scopes,members:controls.members.map(member=>({...member,selected:body.selectedTokens.includes(member.token)}))};}return {ok:true,json:async()=>controls};});vi.stubGlobal("fetch",fetcher);
  render(<SharingControls/>);await screen.findByText("Sharing is off");
  fireEvent.click(screen.getByLabelText("Strip 1"));fireEvent.click(screen.getByLabelText("Share identification status"));fireEvent.click(screen.getByRole("button",{name:"Save consent"}));
  await screen.findByText("Sharing is on");const saved=fetcher.mock.calls.find(call=>call[1]?.method==="POST");expect(JSON.parse(String(saved?.[1]?.body))).toEqual({enabled:true,scopes:{status:true,details:false},selectedTokens:["abcdefghijklmnopqrstuv"],expectedVersion:0});
  fireEvent.click(screen.getByRole("button",{name:"Turn sharing off and delete check-ins"}));await screen.findByText("Sharing is off");
  expect(JSON.parse(String(fetcher.mock.calls.filter(call=>call[1]?.method==="POST").at(-1)?.[1]?.body)).enabled).toBe(false);
});
