"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildSpokenText } from "@/lib/speech-text";
import type { PublicRecord } from "@/lib/tag-repository";

export default function ReadAloud({ token }: { token: string }) {
  const [status, setStatus] = useState("");
  const [phase, setPhase] = useState<"idle" | "checking" | "speaking">("idle");
  const [failed, setFailed] = useState(false);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const readButton = useRef<HTMLButtonElement>(null);

  const cancelWork = useCallback(() => {
    generation.current++;
    controller.current?.abort();
    controller.current = null;
    window.clearTimeout(timer.current);
    timer.current = undefined;
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    // Leaving the page must not allow a delayed lookup to start unrequested
    // speech in the background. The generation guard also covers late events.
    const interrupt = () => {
      if (document.visibilityState === "hidden") {
        cancelWork(); setPhase("idle"); setFailed(false); setStatus("Reading stopped.");
      }
    };
    const hide = () => {
      cancelWork(); setPhase("idle"); setFailed(false); setStatus("Reading stopped.");
    };
    document.addEventListener("visibilitychange", interrupt);
    window.addEventListener("pagehide", hide);
    return () => {
      document.removeEventListener("visibilitychange", interrupt);
      window.removeEventListener("pagehide", hide);
      cancelWork();
    };
  }, [cancelWork]);

  async function speak() {
    cancelWork(); setFailed(false);
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setStatus("Speech is unavailable in this browser. Use your screen reader.");
      setPhase("idle");
      return;
    }
    const current = generation.current;
    const requestController = new AbortController();
    controller.current = requestController;
    setPhase("checking"); setStatus("Checking the current medicine record.");
    timer.current = window.setTimeout(() => {
      if (generation.current !== current) return;
      cancelWork(); setPhase("idle"); setFailed(true);
      setStatus("The current record could not be verified. Check your connection and ask a pharmacist.");
    }, 10000);
    try {
      const response = await fetch(`/api/public/tags/${encodeURIComponent(token)}`, { cache: "no-store", signal: requestController.signal });
      const body = await response.json();
      if (generation.current !== current) return;
      if (!response.ok || body?.kind !== "active" || body.record?.token !== token ||
          !["CURRENT", "EXPIRED"].includes(body.expiryState) ||
          !["genericName", "strength", "dosageForm", "batchNumber", "expiryMonth", "instruction"].every(key => typeof body.record[key] === "string" && body.record[key].trim())) {
        throw new Error("Record unavailable");
      }
      const text = buildSpokenText(body.record as PublicRecord, body.expiryState === "EXPIRED");
      window.clearTimeout(timer.current); timer.current = undefined; controller.current = null;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-IN";
      utterance.onerror = () => {
        if (generation.current !== current) return;
        setPhase("idle"); setFailed(true); setStatus("Speech failed. Use your screen reader.");
      };
      utterance.onstart = () => {
        if (generation.current === current) setStatus("Reading medicine information.");
      };
      utterance.onend = () => {
        if (generation.current !== current) return;
        setPhase("idle"); setStatus("Finished reading.");
      };
      setPhase("speaking"); setStatus("Starting browser speech.");
      window.speechSynthesis.speak(utterance);
    } catch {
      if (generation.current !== current) return;
      cancelWork(); setPhase("idle"); setFailed(true);
      setStatus("The current record could not be verified or read. Reload the page and ask a pharmacist to verify the strip.");
    }
  }

  return (
    <div>
      <button ref={readButton} type="button" className="speak-button" onClick={speak} disabled={phase === "checking"}>
        Read medicine aloud
      </button>
      {phase !== "idle" && <button type="button" onClick={() => {
        cancelWork(); setPhase("idle"); setFailed(false); setStatus("Reading stopped.");
        // Return keyboard focus after the Stop control is removed and Read is
        // re-enabled. If navigation unmounts it, the null ref makes this inert.
        window.setTimeout(() => readButton.current?.focus(), 0);
      }}>Stop reading</button>}
      {status && <p role={failed ? "alert" : "status"}>{status}</p>}
    </div>
  );
}
