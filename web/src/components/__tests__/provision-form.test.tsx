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
  }]} />);

  fireEvent.change(screen.getByLabelText("Batch on the sample strip"), { target: { value: "DEMO-A1" } });
  fireEvent.change(screen.getByLabelText("Labelled expiry month"), { target: { value: "2028-02" } });
  fireEvent.change(screen.getByLabelText("Sample instruction (test data)"), { target: { value: "Test instruction" } });
  fireEvent.click(screen.getByRole("button", { name: "Review before creating" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm and create pending record" }));

  expect((await screen.findByTestId("qr-url")).textContent).toBe(url);
  expect(screen.getByTestId("nfc-url").textContent).toBe(url);
});
