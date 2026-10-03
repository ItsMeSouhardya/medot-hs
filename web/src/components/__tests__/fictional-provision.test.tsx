// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ProvisionForm from "../provision-form";
import { medicineCatalog } from "@/lib/medicine-catalog";
import { demoPrescriptions } from "@/data/demo-prescriptions";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("selects an available fictional template with exact languages and explicit sample timing", () => {
  render(<ProvisionForm medicines={medicineCatalog} />);
  const item = demoPrescriptions.find(group => group.reviewStatus === "DEMO_TEMPLATE")!.items[0];
  fireEvent.change(screen.getByLabelText("Reviewed demo preset"), { target: { value: item.id } });
  expect((screen.getByLabelText("Medicine") as HTMLSelectElement).value).toBe(item.medicineId);
  expect((screen.getByLabelText("English instruction (required)") as HTMLTextAreaElement).value).toBe(item.instruction);
  expect((screen.getByLabelText("Bengali instruction (required)") as HTMLTextAreaElement).value).toBe(item.instructionBn);
  expect((screen.getByLabelText("Hindi instruction (optional)") as HTMLTextAreaElement).value).toBe(item.instructionHi);
  expect((screen.getByRole("checkbox", { name: "Morning" }) as HTMLInputElement).checked).toBe(true);
  expect((screen.getByRole("checkbox", { name: "Evening" }) as HTMLInputElement).checked).toBe(true);
  expect((screen.getByLabelText("Labelled expiry month") as HTMLInputElement).value).toBe("");
});
it("starts a new pack-check entry from any blocked seed without mutating or approving the original", () => {
  vi.stubGlobal("fetch", vi.fn()); render(<ProvisionForm medicines={medicineCatalog} />);
  fireEvent.change(screen.getByLabelText("Prepare a checked replacement for a blocked pack"), { target: { value: "rabijoi-dsr" } });
  expect((screen.getByLabelText("Medicine name") as HTMLInputElement).value).toBe("Rabeprazole and Domperidone SR");
  expect((screen.getByLabelText("Strength") as HTMLInputElement).value).toBe("");
  expect((screen.getByLabelText("Label source") as HTMLSelectElement).value).toBe("PHYSICAL_PACK");
  expect(screen.queryByRole("button", { name: "Mark reviewed and ready" })).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});
it("a fictional template cannot fill a physical pack even if its readiness is changed", () => {
  const item = demoPrescriptions.find(group => group.reviewStatus === "DEMO_TEMPLATE")!.items[0];
  const rows = medicineCatalog.map(row => row.id === item.medicineId ? { ...row, recordKind: "PHYSICAL_PACK" as const } : row);
  render(<ProvisionForm medicines={rows} />);
  fireEvent.change(screen.getByLabelText("Reviewed demo preset"), { target: { value: item.id } });
  expect((screen.getByLabelText("English instruction (required)") as HTMLTextAreaElement).value).toBe("");
  expect((screen.getByLabelText("Medicine") as HTMLSelectElement).value).not.toBe(item.medicineId);
});
