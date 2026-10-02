// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import QRCode from "qrcode";
import QrCode from "../qr-code";
vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });
it("downloads and prints only the QR for the exact canonical URL", async () => {
  vi.mocked(QRCode.toDataURL).mockResolvedValue("data:image/png;base64,Zm9v" as never);
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  const url = "https://medot.example/m/abcdefghijklmnopqrstuv";
  render(<QrCode url={url} />);
  const download = await screen.findByRole("link", { name: "Download QR label" });
  expect(download.getAttribute("href")).toBe("data:image/png;base64,Zm9v");
  expect(download.getAttribute("download")).toContain("qrstuv");
  expect(QRCode.toDataURL).toHaveBeenCalledWith(url, expect.anything());
  fireEvent.click(screen.getByRole("button", { name: "Print QR label" }));
  expect(print).toHaveBeenCalledOnce();
});
it("never shows or downloads a stale QR after its URL changes", async () => {
  vi.mocked(QRCode.toDataURL).mockResolvedValueOnce("data:image/png;base64,b2xk" as never);
  let finish: (value: string) => void = () => {};
  vi.mocked(QRCode.toDataURL).mockImplementationOnce(() => new Promise<string>(resolve => { finish = resolve; }) as never);
  const { rerender } = render(<QrCode url="https://medot.example/m/abcdefghijklmnopqrstuv" />);
  await screen.findByRole("img");
  rerender(<QrCode url="https://medot.example/m/bcdefghijklmnopqrstuvw" />);
  expect(screen.queryByRole("img")).toBeNull();
  expect(screen.queryByRole("link", { name: "Download QR label" })).toBeNull();
  await act(async () => { finish("data:image/png;base64,bmV3"); });
  expect((await screen.findByRole("link", { name: "Download QR label" })).getAttribute("href")).toBe("data:image/png;base64,bmV3");
});
