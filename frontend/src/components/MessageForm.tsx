import { useState, type FormEvent } from "react";
import { sendMessage } from "../api";
import type { TriageResult } from "../types";
import { TriageBadge } from "./TriageBadge";

/** Lets staff test the triage flow the same way an SMS would reach it. */
export function MessageForm() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(await sendMessage(text.trim()));
      setText("");
    } catch (err) {
      setResult(null);
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card">
      <label htmlFor="msg">Patient message</label>
      <textarea
        id="msg"
        value={text}
        maxLength={1000}
        rows={3}
        placeholder="e.g. My baby has a high fever"
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" disabled={busy || !text.trim()}>
        {busy ? "Triaging..." : "Triage message"}
      </button>
      {error && <p role="alert" className="error">{error}</p>}
      {result && (
        <div className="result" data-testid="result">
          <TriageBadge triage={result.triage} />
          <p>{result.guidance}</p>
        </div>
      )}
    </form>
  );
}
