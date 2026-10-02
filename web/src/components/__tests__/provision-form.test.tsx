// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ProvisionForm from "../provision-form";

vi.mock("../qr-code", () => ({
  default: ({ url }: { url: string }) => <span data-testid="qr-url">{url}</span>,
}));
vi.mock("../tag-writer", () => ({
  default: ({ url }: { url: string }) => <span data-testid="nfc-url">{url}</span>,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("passes the server-returned URL unchanged to QR and NFC controls", async () => {
  const url = "https://medot.example/m/abcdefghijklmnopqrstuv";
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ token: "abcdefghijklmnopqrstuv", url }),
  })));
  render(<ProvisionForm medicines={[{
    id: "metformin-500",
    genericName: "Metformin",
    strength: "500 mg",
    dosageForm: "Tablet",
    catalogStatus: "DEMO_READY",
  }]} />);

  fireEvent.change(screen.getByLabelText("Batch on the sample strip"), { target: { value: "DEMO-A1" } });
  fireEvent.change(screen.getByLabelText("Labelled expiry month"), { target: { value: "2028-02" } });
  fireEvent.change(screen.getByLabelText("English instruction (required)"), { target: { value: "Test instruction" } });
  fireEvent.change(screen.getByLabelText("Bengali instruction (required)"), { target: { value: "ডেমো নির্দেশনা" } });
  fireEvent.click(screen.getByRole("button", { name: "Review before creating" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm and create pending record" }));

  expect((await screen.findByTestId("qr-url")).textContent).toBe(url);
  expect(screen.getByTestId("nfc-url").textContent).toBe(url);
  const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
  expect(body.instructionBn).toBe("ডেমো নির্দেশনা");
  expect(body).not.toHaveProperty("instructionHi");
});

const ready = { id: "paracetamol-500", genericName: "Paracetamol", strength: "500 mg", dosageForm: "Tablet", catalogStatus: "DEMO_READY" as const };
const blocked = { id: "rabijoi-dsr", brandName: "Rabijoi DSR", genericName: "Rabeprazole and Domperidone SR", strength: "Pack check required", dosageForm: "Capsule", catalogStatus: "PACK_CHECK_REQUIRED" as const };

it("disables blocked pack entries and rejects a manipulated selection", () => {
  render(<ProvisionForm medicines={[blocked, ready]} />);
  const selector = screen.getByLabelText("Medicine") as HTMLSelectElement;
  expect(selector.value).toBe(ready.id);
  const option = screen.getByRole("option", { name: /Rabijoi DSR/ }) as HTMLOptionElement;
  expect(option.disabled).toBe(true);
  fireEvent.change(selector, { target: { value: blocked.id } });
  expect(screen.getByRole("button", { name: "Review before creating" }).hasAttribute("disabled")).toBe(true);
});

it("cannot review missing Bengali and includes exact Hindi only when supplied", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ token: "abcdefghijklmnopqrstuv", url: "https://medot.example/m/abcdefghijklmnopqrstuv" }) })));
  render(<ProvisionForm medicines={[ready]} />);
  fireEvent.change(screen.getByLabelText("Batch on the sample strip"), { target: { value: "DEMO-ONLY" } });
  fireEvent.change(screen.getByLabelText("Labelled expiry month"), { target: { value: "2028-12" } });
  fireEvent.change(screen.getByLabelText("English instruction (required)"), { target: { value: "Demo only." } });
  fireEvent.click(screen.getByRole("button", { name: "Review before creating" }));
  expect(screen.queryByRole("button", { name: "Confirm and create pending record" })).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Bengali instruction (required)"), { target: { value: "শুধুমাত্র ডেমো।" } });
  fireEvent.change(screen.getByLabelText("Hindi instruction (optional)"), { target: { value: "केवल डेमो।" } });
  fireEvent.click(screen.getByRole("button", { name: "Review before creating" }));
  expect(screen.getByText("শুধুমাত্র ডেমো।")).toBeTruthy();
  expect(screen.getByText("केवल डेमो।")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Confirm and create pending record" }));
  await screen.findByTestId("qr-url");
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)).toMatchObject({ instruction: "Demo only.", instructionBn: "শুধুমাত্র ডেমো।", instructionHi: "केवल डेमो।" });
});
