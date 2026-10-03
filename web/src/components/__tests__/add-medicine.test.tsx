// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AddMedicine from "../pharmacy/add-medicine";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const saved = { id: "custom_abcdefghijklmnopqrstuv", genericName: "Demo Metformin", strength: "500 mg", dosageForm: "Tablet", recordKind: "FICTIONAL_DEMO", catalogStatus: "PACK_CHECK_REQUIRED", infoEn: "Fictional label.", infoBn: "শুধুমাত্র ডেমো।" };
function fill() {
  fireEvent.change(screen.getByLabelText("Medicine name"), { target: { value: " Demo Metformin " } });
  fireEvent.change(screen.getByLabelText("Strength"), { target: { value: "500 mg" } });
  fireEvent.change(screen.getByLabelText("Form"), { target: { value: "Tablet" } });
  fireEvent.change(screen.getByLabelText("Label source"), { target: { value: "FICTIONAL_DEMO" } });
  fireEvent.change(screen.getByLabelText("Medicine information in English (optional)"), { target: { value: "Fictional label." } });
  fireEvent.change(screen.getByLabelText("Matching Bengali information"), { target: { value: "শুধুমাত্র ডেমো।" } });
}
it("saves blocked data, requires two explicit attestations, then uses the exact reviewed row", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, status: 201, json: async () => saved }).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ...saved, catalogStatus: "DEMO_READY" }) });
  vi.stubGlobal("fetch", fetcher);
  const onSaved = vi.fn(), onUse = vi.fn();
  render(<AddMedicine onSaved={onSaved} onUse={onUse} />); fill();
  fireEvent.click(screen.getByRole("button", { name: "Save blocked medicine" }));
  await screen.findByRole("heading", { name: "Review saved medicine" });
  expect(screen.queryByRole("button", { name: "Use this medicine" })).toBeNull();
  const review = screen.getByRole("button", { name: "Mark reviewed and ready" });
  expect(review.hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("checkbox", { name: /I checked these exact label/ }));
  expect(review.hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("checkbox", { name: /I reviewed every supplied language/ }));
  fireEvent.click(review);
  fireEvent.click(await screen.findByRole("button", { name: "Use this medicine" }));
  expect(onUse).toHaveBeenCalledWith(saved.id);
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ labelReviewed: true, languagesReviewed: true, expected: { genericName: "Demo Metformin", strength: "500 mg", dosageForm: "Tablet", recordKind: "FICTIONAL_DEMO", infoEn: "Fictional label.", infoBn: "শুধুমাত্র ডেমো।" } });
  expect(onSaved.mock.calls[0][0].catalogStatus).toBe("PACK_CHECK_REQUIRED");
});
it("keeps the draft and exact request ID across a lost response and session expiry", async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(new Error("lost response")).mockResolvedValueOnce({ ok: false, status: 401 });
  vi.stubGlobal("fetch", fetcher);
  render(<AddMedicine onSaved={() => {}} onUse={() => {}} />); fill();
  fireEvent.click(screen.getByRole("button", { name: "Save blocked medicine" }));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Retry exact save" }));
  await screen.findByRole("link", { name: "Sign in again in a new tab" });
  expect(fetcher.mock.calls[0][1].body).toBe(fetcher.mock.calls[1][1].body);
  expect((screen.getByLabelText("Medicine name") as HTMLInputElement).value.trim()).toBe("Demo Metformin");
});
it("locks double-click creation and does not enable use after a rejected review", async () => {
  let resolve: (r: unknown) => void = () => {};
  const fetcher = vi.fn().mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValueOnce({ ok: false, status: 409 });
  vi.stubGlobal("fetch", fetcher);
  render(<AddMedicine onSaved={() => {}} onUse={() => {}} />); fill();
  const button = screen.getByRole("button", { name: "Save blocked medicine" });
  fireEvent.click(button); fireEvent.click(button);
  expect(fetcher).toHaveBeenCalledOnce();
  resolve({ ok: true, status: 201, json: async () => saved });
  await screen.findByRole("heading", { name: "Review saved medicine" });
  fireEvent.click(screen.getByRole("checkbox", { name: /I checked these exact label/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I reviewed every supplied language/ }));
  fireEvent.click(screen.getByRole("button", { name: "Mark reviewed and ready" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("conflict"));
  expect(screen.queryByRole("button", { name: "Use this medicine" })).toBeNull();
});

it("resumes a blocked saved draft after reload without creating another medicine", async () => {
  vi.stubGlobal("fetch", vi.fn());
  render(<AddMedicine initialMedicine={{ ...saved, recordKind: "FICTIONAL_DEMO", catalogStatus: "PACK_CHECK_REQUIRED" }} onSaved={() => {}} onUse={() => {}} />);
  expect(screen.getByRole("heading", { name: "Review saved medicine" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Mark reviewed and ready" }).hasAttribute("disabled")).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});
