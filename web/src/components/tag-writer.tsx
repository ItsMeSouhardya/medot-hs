"use client";
import { useEffect, useRef, useState } from "react";
type NdefReader = { write(message: { records: Array<{ recordType: "url"; data: string }> }): Promise<void> };
type NdefReaderWindow = Window & { NDEFReader?: new () => NdefReader };
export default function TagWriter({ token, url, initialStatus = "PENDING", activationReady = true }: {
  token: string; url: string; initialStatus?: "PENDING" | "ACTIVE" | "REVOKED"; activationReady?: boolean;
}) {
  const [writeStatus, setWriteStatus] = useState("");
  const [lifecycleStatus, setLifecycleStatus] = useState(initialStatus);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [nfcAvailable, setNfcAvailable] = useState<boolean | null>(null);
  const locked = useRef(false);
  const titleId = "tag-writer-title-" + token;
  useEffect(() => {
    const available = Boolean((window as NdefReaderWindow).NDEFReader) && window.isSecureContext !== false;
    const timer = setTimeout(() => setNfcAvailable(available), 0);
    return () => clearTimeout(timer);
  }, []);
  async function copyUrl() {
    try { await navigator.clipboard.writeText(url); setWriteStatus("URL copied."); }
    catch { setWriteStatus("Could not copy automatically. Select the URL text above to copy it."); }
  }
  async function writeTag() {
    if (locked.current || lifecycleStatus !== "PENDING") return;
    const Reader = (window as NdefReaderWindow).NDEFReader;
    if (!Reader || window.isSecureContext === false) { setWriteStatus("Browser NFC writing is unavailable. Use NFC Tools below."); return; }
    locked.current = true; setBusy(true); setVerified(false); setError("");
    setWriteStatus("Hold the NTAG213 near your phone.");
    try {
      await new Reader().write({ records: [{ recordType: "url", data: url }] });
      setWriteStatus("URL written. Close the writer and retap the tag independently.");
    } catch { setWriteStatus("Write failed. This record is still pending."); }
    finally { locked.current = false; setBusy(false); }
  }
  async function changeStatus(action: "activate" | "revoke") {
    if (locked.current || lifecycleStatus === "REVOKED" || (action === "activate" && (!verified || !activationReady || lifecycleStatus !== "PENDING"))) return;
    locked.current = true; setBusy(true); setError(""); setSessionExpired(false);
    try {
      const response = await fetch("/api/admin/tags/" + token + "/" + action, {
        method: "POST",
        ...(action === "activate" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verified: true }) } : {}),
      });
      if (!response.ok) {
        setSessionExpired(response.status === 401);
        setError(response.status === 409 ? "This tag may have changed or its required instructions are incomplete. Refresh the saved state before continuing."
          : response.status === 401 ? "Session expired. Sign in again, then retry."
          : response.status === 403 ? "Pharmacy access denied. Check your authorized account and site origin."
          : "Could not confirm the tag state. Refresh the saved state before retrying.");
        return;
      }
      setLifecycleStatus(action === "activate" ? "ACTIVE" : "REVOKED");
      setConfirmRevoke(false); setWriteStatus(""); setVerified(false);
    } catch { setError("Network unavailable. The tag state has not been confirmed. Refresh the saved state before retrying."); }
    finally { locked.current = false; setBusy(false); }
  }
  return (
    <section className="writer-panel" aria-labelledby={titleId}>
      <h2 id={titleId}>NFC tag controls</h2>
      <p className={"status-pill status-" + lifecycleStatus.toLowerCase()}>{lifecycleStatus}</p>
      {lifecycleStatus === "PENDING" && <>
        <p>Write one URL/NDEF record containing the exact URL above. The tag must contain no medicine details.</p>
        <div className="action-row"><button type="button" className="secondary-button" onClick={copyUrl} disabled={busy}>Copy URL</button><button type="button" className="secondary-button" onClick={writeTag} disabled={busy || nfcAvailable === false}>Try writing with this browser</button></div>
        <p className="small-note">{nfcAvailable === null ? "Checking this browser's NFC writing capability…" : nfcAvailable ? "Browser NFC writing is available. Phone permission is required when you choose Write." : "This browser cannot write NFC tags. Use NFC Tools or another URL/NDEF writer."}</p>
        <details className="writer-help" open={nfcAvailable === false}><summary>Write with NFC Tools</summary><ol><li>Copy the exact URL above. In NFC Tools, choose Write, Add a record, then URL/URI.</li><li>Paste the URL as the only record, choose Write and hold the clip near the NFC antenna.</li><li>Close NFC Tools before independently retapping the tag.</li></ol></details>
        <div className="readback-panel">
          <h3>Read back before activation</h3>
          <ol><li>Retap the tag using normal phone NFC handling, independently of the writer.</li><li>Confirm the pending page says token ending <strong className="token-ending">{token.slice(-6)}</strong>.</li><li>Scan the QR separately and confirm the same URL and token ending.</li><li>Return here, or reopen the saved record from Recent tags.</li></ol>
          {!activationReady && <p role="alert">This pending record lacks required reviewed instructions or a ready catalog entry. Issue a new token.</p>}
          <label className="confirmation-check"><input type="checkbox" checked={verified} disabled={busy || !activationReady} onChange={event => setVerified(event.target.checked)} />I retapped this tag and checked the token ending.</label>
          <p className="small-note">This confirms your physical check; the browser cannot prove that a tag was read.</p>
          <button type="button" onClick={() => changeStatus("activate")} disabled={!verified || !activationReady || busy}>Activate verified tag</button>
        </div>
      </>}
      {writeStatus && <p role="status">{writeStatus}</p>}
      {lifecycleStatus === "ACTIVE" && <p role="status">Tag active. Retap it to open the medicine record.</p>}
      {lifecycleStatus !== "REVOKED" && <div className="revoke-panel">{confirmRevoke ? <><p>Withdraw this token permanently? Corrections require a new token and readback.</p><div className="action-row"><button type="button" className="danger-button" onClick={() => changeStatus("revoke")} disabled={busy}>Confirm revocation</button><button type="button" className="secondary-button" onClick={() => setConfirmRevoke(false)} disabled={busy}>Keep this tag</button></div></> : <button type="button" className="secondary-button" onClick={() => setConfirmRevoke(true)} disabled={busy}>Revoke this tag</button>}</div>}
      {lifecycleStatus === "REVOKED" && <p role="alert">Tag revoked. Issue a new token for corrections.</p>}
      {error && <div className="operator-alert" role="alert"><p>{error}</p>{sessionExpired && <a href="/sign-in" target="_blank" rel="noopener noreferrer">Sign in again in a new tab</a>}<p><a href={"/pharmacy/tags?tag=" + encodeURIComponent(token)}>Refresh saved state</a></p></div>}
    </section>
  );
}
