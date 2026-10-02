"use client";

import { useState } from "react";

type NdefReader = {
  write(message: {
    records: Array<{ recordType: "url"; data: string }>;
  }): Promise<void>;
};
type NdefReaderWindow = Window & { NDEFReader?: new () => NdefReader };

export default function TagWriter({
  token,
  url,
  initialStatus = "PENDING",
}: {
  token: string;
  url: string;
  initialStatus?: "PENDING" | "ACTIVE" | "REVOKED";
}) {
  const [writeStatus, setWriteStatus] = useState("");
  const [lifecycleStatus, setLifecycleStatus] = useState<
    "PENDING" | "ACTIVE" | "REVOKED"
  >(initialStatus);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const titleId = "tag-writer-title-" + token;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setWriteStatus("URL copied.");
    } catch {
      setWriteStatus("Could not copy automatically. Select the URL text above to copy it.");
    }
  }

  async function writeTag() {
    const Reader = (window as NdefReaderWindow).NDEFReader;
    if (!Reader) {
      setWriteStatus("Browser NFC writing is unavailable. Use the tag-writing app fallback.");
      return;
    }
    setWriteStatus("Hold the NTAG213 near your phone.");
    setError("");
    try {
      await new Reader().write({ records: [{ recordType: "url", data: url }] });
      setWriteStatus("URL written. Close the writer and retap the tag independently.");
    } catch {
      setWriteStatus("Write failed. This record is still pending.");
    }
  }

  async function changeStatus(action: "activate" | "revoke") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/tags/" + token + "/" + action, {
        method: "POST",
      });
      if (!response.ok) {
        setError("Could not " + action + " this tag. Check the session and tag state.");
        return;
      }
      setLifecycleStatus(action === "activate" ? "ACTIVE" : "REVOKED");
    } catch {
      setError("Network unavailable. The tag state has not been confirmed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId}>NFC tag controls</h2>
      {lifecycleStatus === "PENDING" && (
        <>
          <p>Write one URL/NDEF record containing the exact URL above. The tag must contain no medicine details.</p>
          <button type="button" onClick={copyUrl}>Copy URL</button>
          <button type="button" onClick={writeTag}>Try writing with this browser</button>
          <p>
            Browser writing is optional. If unavailable or unsuccessful, copy the URL
            and write it with an NFC-writing app as a URL record.
          </p>
          <ol>
            <li>Close the writer and retap the tag using normal phone NFC handling.</li>
            <li>Confirm the pending page says token ending <strong>{token.slice(-6)}</strong>.</li>
            <li>Return to this screen, or reopen the record from Recent tags.</li>
          </ol>
          <label>
            <input
              type="checkbox"
              checked={verified}
              onChange={(event) => setVerified(event.target.checked)}
            />
            I retapped this tag and checked the token ending.
          </label>
          <button
            type="button"
            onClick={() => changeStatus("activate")}
            disabled={!verified || busy}
          >
            Activate verified tag
          </button>
        </>
      )}
      {writeStatus && <p role="status">{writeStatus}</p>}
      {lifecycleStatus === "ACTIVE" && (
        <p role="status">Tag active. Retap it to open the medicine record.</p>
      )}
      {lifecycleStatus !== "REVOKED" && (
        <button type="button" onClick={() => changeStatus("revoke")} disabled={busy}>
          Revoke this tag
        </button>
      )}
      {lifecycleStatus === "REVOKED" && (
        <p role="alert">Tag revoked. Issue a new token for corrections.</p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
