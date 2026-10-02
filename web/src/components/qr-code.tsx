"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
export default function QrCode({ url }: { url: string }) {
  const [generated, setGenerated] = useState<{ url: string; image?: string; error?: string } | null>(null);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 280, margin: 4, errorCorrectionLevel: "M" })
      .then(image => { if (active) setGenerated({ url, image }); })
      .catch(() => { if (active) setGenerated({ url, error: "QR could not be generated. Use the exact URL and try reloading." }); });
    return () => { active = false; };
  }, [url]);
  const current = generated?.url === url ? generated : null;
  if (current?.error) return <p role="alert">{current.error}</p>;
  if (!current?.image) return <p role="status">Generating QR…</p>;
  const ending = url.split("/").at(-1)?.slice(-6) ?? "label";
  return <div className="qr-panel"><figure className="medot-print-label"><Image src={current.image} alt="QR code for this MEDOT record" width={280} height={280} unoptimized /><figcaption><strong>MEDOT · Token ending {ending}</strong><span className="print-url">{url}</span></figcaption></figure><div className="qr-actions"><a className="button-link secondary-button" href={current.image} download={"medot-" + ending + ".png"}>Download QR label</a><button className="secondary-button" type="button" onClick={() => window.print()}>Print QR label</button></div><p className="small-note">Scan to confirm the same URL as the NFC tag.</p></div>;
}
