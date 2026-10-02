// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Navbar from "../marketing/navbar";
import LanguagePreview from "../marketing/language-preview";

afterEach(cleanup);
it("opens the mobile navigation, closes on Escape and restores trigger focus", () => {
  render(<Navbar />);
  const button = screen.getByRole("button", { name: "Open navigation" });
  fireEvent.click(button);
  expect(button.getAttribute("aria-expanded")).toBe("true");
  fireEvent.keyDown(screen.getByRole("navigation", { name: "Main navigation" }), { key: "Escape" });
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(button);
});
it("closes mobile navigation when a destination is selected", () => {
  render(<Navbar />);
  fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
  fireEvent.click(screen.getByRole("link", { name: "How it works" }));
  expect(screen.getByRole("button", { name: "Open navigation" }).getAttribute("aria-expanded")).toBe("false");
});
it("closes a resource disclosure on Escape and returns focus to its summary", () => {
  render(<Navbar />);
  const summary = screen.getByText("Resources");
  const details = summary.closest("details")!;
  details.open = true;
  fireEvent.keyDown(details, { key: "Escape" });
  expect(details.open).toBe(false);
  expect(document.activeElement).toBe(summary);
});
it("previews all three scripts without starting speech or presenting a prescription", () => {
  render(<LanguagePreview />);
  expect(screen.getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "বাংলা" }));
  expect(screen.getByText("ওষুধের তথ্য").closest("[lang]")?.getAttribute("lang")).toBe("bn");
  fireEvent.click(screen.getByRole("button", { name: "हिन्दी" }));
  expect(screen.getByText("दवा की जानकारी").closest("[lang]")?.getAttribute("lang")).toBe("hi");
  expect(screen.getByRole("button", { name: /जानकारी सुनें/ }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByText(/Illustrative interface/)).toBeTruthy();
});
