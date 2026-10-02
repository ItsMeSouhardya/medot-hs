"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrCode({ url }: { url: string }) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 240, margin: 1, errorCorrectionLevel: "M" })
      .then((result) => {
        if (active) setImage(result);
      })
      .catch(() => {
        if (active) setError("QR could not be generated.");
      });
    return () => { active = false; };
  }, [url]);

  if (error) return <p role="alert">{error}</p>;
  if (!image) return <p role="status">Generating QR…</p>;
  return (
    <Image
      src={image}
      alt="QR code for this MEDOT record"
      width={240}
      height={240}
      unoptimized
    />
  );
}
