// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CandidateReader from "../finder/candidate-reader";
const token='abcdefghijklmnopqrstuv',url=()=>`${location.origin}/m/${token}`;
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function nfc(){const instances: {onreading:((e:unknown)=>void)|null;onreadingerror:(()=>void)|null;scan:ReturnType<typeof vi.fn>}[]=[];
  const scan=vi.fn(async(options:unknown)=>{void options;});
  class Fake{onreading=null;onreadingerror=null;scan=scan;constructor(){instances.push(this);}}
  vi.stubGlobal('NDEFReader',Fake);return {instances,scan};
}
it('URL entry rejects foreign input without opening/fetching it and accepts only canonical tokens',()=>{
  const candidate=vi.fn(),failure=vi.fn();render(<CandidateReader language="en" enabled onCandidate={candidate} onFailure={failure}/>);
  fireEvent.change(screen.getByLabelText('Canonical MEDOT URL'),{target:{value:'https://foreign.test/m/'+token}});
  fireEvent.click(screen.getByRole('button',{name:'Check this URL'}));expect(candidate).not.toHaveBeenCalled();expect(failure).toHaveBeenCalledOnce();
  fireEvent.change(screen.getByLabelText('Canonical MEDOT URL'),{target:{value:url()}});
  fireEvent.click(screen.getByRole('button',{name:'Check this URL'}));expect(candidate).toHaveBeenCalledWith(token);
});
it('never starts NFC on load; a gesture enables one foreground reader that aborts on hide',async()=>{
  const f=nfc(),candidate=vi.fn();render(<CandidateReader language="en" enabled onCandidate={candidate} onFailure={vi.fn()}/>);
  expect(f.scan).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Start NFC scan'}));
  await waitFor(()=>expect(f.scan).toHaveBeenCalledOnce());
  const bytes=new TextEncoder().encode(url()),late=f.instances[0].onreading;
  act(()=>late?.({message:{records:[{recordType:'url',data:new DataView(bytes.buffer)}]},serialNumber:'NEVER-STORE'}));expect(candidate).toHaveBeenCalledWith(token);
  fireEvent(window,new Event('pagehide'));
  expect((f.scan.mock.calls[0][0] as {signal:AbortSignal}).signal.aborted).toBe(true);
  act(()=>late?.({message:{records:[{recordType:'url',data:new DataView(bytes.buffer)}]}}));expect(candidate).toHaveBeenCalledTimes(1);
});
it('denied NFC permission leaves URL entry usable',async()=>{
  const f=nfc();f.scan.mockRejectedValueOnce(new DOMException('Denied','NotAllowedError'));
  render(<CandidateReader language="en" enabled onCandidate={vi.fn()} onFailure={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Start NFC scan'}));
  expect(await screen.findByText('NFC could not start. Use the URL field below.')).toBeTruthy();expect(screen.getByLabelText('Canonical MEDOT URL').hasAttribute('disabled')).toBe(false);
});
it('reading errors and malformed NDEF clear the previous result',async()=>{
  const f=nfc(),failure=vi.fn();render(<CandidateReader language="en" enabled onCandidate={vi.fn()} onFailure={failure}/>);
  fireEvent.click(screen.getByRole('button',{name:'Start NFC scan'}));await waitFor(()=>expect(f.scan).toHaveBeenCalledOnce());
  act(()=>f.instances[0].onreadingerror?.());act(()=>f.instances[0].onreading?.({message:{records:[]}}));expect(failure).toHaveBeenCalledTimes(2);
});
it('disabling or changing language cancels NFC and resets the displayed scan status',async()=>{
  const f=nfc();const view=render(<CandidateReader language="en" enabled onCandidate={vi.fn()} onFailure={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Start NFC scan'}));await screen.findByText('Scanning. Move your phone closer to one MEDOT tag.');
  view.rerender(<CandidateReader language="bn" enabled={false} onCandidate={vi.fn()} onFailure={vi.fn()}/>);
  expect((f.scan.mock.calls[0][0] as {signal:AbortSignal}).signal.aborted).toBe(true);
  expect(screen.queryByText('স্ক্যান চলছে। ফোনটি একটি MEDOT ট্যাগের কাছে আনুন।')).toBeNull();
});
