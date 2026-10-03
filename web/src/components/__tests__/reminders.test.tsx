// @vitest-environment jsdom
import { afterEach,expect,it,vi } from "vitest";
import { cleanup,fireEvent,render,screen,waitFor } from "@testing-library/react";
import Reminders from "../reminders/reminders";
import { reminderCopy } from "@/lib/reminders/copy";
const mocks=vi.hoisted(()=>({data:{configured:true,enabled:false,expiresAt:null,reminders:[],publicKey:"BA"} as unknown,request:vi.fn(),refresh:vi.fn()}));
vi.mock("../caregiver/private-client",()=>({privateRequest:mocks.request,usePrivateResource:()=>({data:mocks.data,busy:false,error:false,refresh:mocks.refresh,run:async(operation:(signal:AbortSignal)=>Promise<unknown>)=>{try{await operation(new AbortController().signal);return true;}catch{return false;}}})}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();vi.clearAllMocks();mocks.data={configured:true,enabled:false,expiresAt:null,reminders:[],publicKey:"BA"};});
function browser(permission="denied"){
  const requestPermission=vi.fn(async()=>permission),register=vi.fn();
  vi.stubGlobal("isSecureContext",true);vi.stubGlobal("PushManager",class{});vi.stubGlobal("Notification",{requestPermission});
  Object.defineProperty(navigator,"serviceWorker",{configurable:true,value:{register,getRegistration:vi.fn(async()=>({pushManager:{getSubscription:async()=>({unsubscribe:vi.fn()})}}))}});
  return {requestPermission,register};
}
it("does not request notification permission automatically; requires explicit consent and button",async()=>{
  const {requestPermission,register}=browser();render(<Reminders/>);
  expect(requestPermission).not.toHaveBeenCalled();const button=screen.getByRole("button",{name:reminderCopy.en.enable});expect(button.hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("checkbox"));await waitFor(()=>expect(button.hasAttribute("disabled")).toBe(false));fireEvent.click(button);
  expect(await screen.findByRole("alert")).toHaveProperty("textContent",reminderCopy.en.denied);
  expect(register).not.toHaveBeenCalled();expect(mocks.request).not.toHaveBeenCalled();
});
it("shows the time zone and only saves after a manual time and valid record are submitted",async()=>{
  mocks.data={configured:true,enabled:true,expiresAt:"2099-01-01",reminders:[],publicKey:"BA"};browser();render(<Reminders/>);
  expect(mocks.request).not.toHaveBeenCalled();fireEvent.change(screen.getByLabelText(reminderCopy.en.record),{target:{value:"a".repeat(22)}});fireEvent.change(screen.getByLabelText(reminderCopy.en.time),{target:{value:"19:30"}});
  fireEvent.click(screen.getByRole("button",{name:reminderCopy.en.save}));await waitFor(()=>expect(mocks.request).toHaveBeenCalled());
  expect(mocks.request.mock.calls[0].slice(2)).toEqual(["POST",{token:"a".repeat(22),time:"19:30",language:"en",enabled:true}]);
});
it("will not remove the browser subscription when deleting server data fails",async()=>{
  mocks.data={configured:true,enabled:true,expiresAt:"2099-01-01",reminders:[],publicKey:"BA"};browser();mocks.request.mockRejectedValueOnce(new Error("offline"));const get=navigator.serviceWorker.getRegistration as ReturnType<typeof vi.fn>;
  render(<Reminders/>);fireEvent.click(screen.getByRole("button",{name:reminderCopy.en.removeAll}));await waitFor(()=>expect(mocks.request).toHaveBeenCalled());expect(get).not.toHaveBeenCalled();
});
it("cancels enabling when the page is left while browser permission is pending",async()=>{
  const {requestPermission,register}=browser("granted");let grant!:(value:string)=>void;
  requestPermission.mockReturnValueOnce(new Promise(resolve=>{grant=resolve;}));
  const view=render(<Reminders/>);fireEvent.click(screen.getByRole("checkbox"));const button=screen.getByRole("button",{name:reminderCopy.en.enable});await waitFor(()=>expect(button.hasAttribute("disabled")).toBe(false));fireEvent.click(button);
  await waitFor(()=>expect(requestPermission).toHaveBeenCalled());view.unmount();grant("granted");await new Promise(resolve=>setTimeout(resolve,0));
  expect(register).not.toHaveBeenCalled();expect(mocks.request).not.toHaveBeenCalled();
});
it("replaces an old browser endpoint after device-cookie loss before saving explicit consent",async()=>{
  browser("granted");const unsubscribe=vi.fn(async()=>true),serialized={endpoint:"https://fcm.googleapis.com/fcm/send/new",keys:{p256dh:"fixture",auth:"fixture"}};
  const subscription={toJSON:()=>serialized,unsubscribe:vi.fn(),options:{applicationServerKey:new Uint8Array([4]).buffer}};
  const subscribe=vi.fn(async()=>subscription),registration={pushManager:{getSubscription:async()=>({unsubscribe,options:{applicationServerKey:new Uint8Array([4]).buffer}}),subscribe}};
  Object.defineProperty(navigator,"serviceWorker",{configurable:true,value:{register:async()=>registration,ready:Promise.resolve(registration)}});
  render(<Reminders/>);fireEvent.click(screen.getByRole("checkbox"));const button=screen.getByRole("button",{name:reminderCopy.en.enable});await waitFor(()=>expect(button.hasAttribute("disabled")).toBe(false));fireEvent.click(button);
  await waitFor(()=>expect(mocks.request).toHaveBeenCalled());expect(unsubscribe).toHaveBeenCalledOnce();expect(subscribe).toHaveBeenCalledOnce();
  expect(mocks.request.mock.calls[0].slice(2)).toEqual(["POST",{subscription:serialized,consent:true}]);
});
