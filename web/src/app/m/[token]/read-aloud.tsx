"use client";

import { useState } from "react";

export default function ReadAloud({ text }: { text: string }) {
  const [status, setStatus] = useState("");

  function speak() {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setStatus("Speech is unavailable in this browser. Use your screen reader.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.onerror = () => setStatus("Speech failed. Use your screen reader.");
    utterance.onstart = () => setStatus("Reading medicine information.");
    utterance.onend = () => setStatus("Finished reading.");
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div>
      <button type="button" className="speak-button" onClick={speak}>
        Read medicine aloud
      </button>
      {status && <p role="status">{status}</p>}
    </div>
  );
}
