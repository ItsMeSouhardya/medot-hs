import { expect, it, vi, afterEach } from "vitest";
import { parseCandidateUrl, decodeCandidateMessage, readCandidate } from "../finder/candidate";
const origin = "https://medot.test", token = "abcdefghijklmnopqrstuv", url = `${origin}/m/${token}`;
const data = (value: string) => { const bytes = new TextEncoder().encode(value); return new DataView(bytes.buffer); };
afterEach(() => vi.unstubAllGlobals());
it("accepts only the exact absolute canonical URL", () => {
  expect(parseCandidateUrl(url, origin)).toBe(token);
  for (const value of [url+'/', url+'?x=1', url+'#', url+'?', url+'#x', ' '+url, url+'\n', '/m/'+token, 'https://other.test/m/'+token, origin+'/m/short', origin+'/m/%61'+token.slice(1), origin+'/m/../m/'+token, 'https://user@medot.test/m/'+token, 'https://MEDOT.test/m/'+token, url+'x'.repeat(256)]) expect(parseCandidateUrl(value, origin)).toBeNull();
});
it("decodes one URL record with its exact byte offset and refuses ambiguous NDEF", () => {
  expect(decodeCandidateMessage({ records: [{ recordType: "url", data: data(url) }] }, origin)).toBe(token);
  const bytes = new TextEncoder().encode('xx'+url+'yy');
  expect(decodeCandidateMessage({ records: [{recordType:'url',data:new DataView(bytes.buffer,2,bytes.length-4)}] }, origin)).toBe(token);
  for (const records of [[], [{recordType:'text',data:data(url)}], [{recordType:'url',data:data(url)},{recordType:'url',data:data(url)}], [{recordType:'url',data:data(url)},{recordType:'url',data:data('https://foreign.test')}], [{recordType:'url',data:data(url)},{recordType:'text',data:data('extra')}], [{recordType:'url',data:new DataView(Uint8Array.of(255).buffer)}], [{recordType:'url'}]]) expect(decodeCandidateMessage({records},origin)).toBeNull();
});
it("uses the validated token's fresh public API rather than a submitted URL", async () => {
  const record = { token, genericName:'Software fixture', strength:'Fixture', dosageForm:'Fixture', batchNumber:'SOFTWARE', expiryMonth:'2099-12', instruction:'Demo only.' };
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({kind:'active',record,expiryState:'CURRENT'}))));
  const signal = new AbortController().signal;
  expect(await readCandidate(token, signal)).toEqual(record);
  expect(fetch).toHaveBeenCalledWith('/api/public/tags/'+token,{cache:'no-store',signal});
  await expect(readCandidate('invalid',signal)).rejects.toMatchObject({kind:'unknown'});
  expect(fetch).toHaveBeenCalledTimes(1);
});
