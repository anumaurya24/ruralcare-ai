import { useCallback, useEffect, useState, type FormEvent } from "react";
import { explain, sendMessage } from "../api";
import { signalLabel } from "../format";
import type { Assessment, Encounter } from "../types";
import { useDictation } from "../useDictation";
import { TriageBadge } from "./TriageBadge";

/** Staff enter (or dictate) a message the way an SMS would arrive, with a live triage preview while typing. */
export function MessageForm({ previewDelayMs = 400 }: { previewDelayMs?: number }) {
  const [text, setText] = useState("");
  const [sender, setSender] = useState("");
  const [preview, setPreview] = useState<Assessment | null>(null);
  const [result, setResult] = useState<Encounter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const append = useCallback((spoken: string) => setText((t) => (t ? `${t} ${spoken}` : spoken)), []);
  const dictation = useDictation(append);

  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      setPreview(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      explain(trimmed, ctrl.signal).then(setPreview).catch(() => {});
    }, previewDelayMs);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [text, previewDelayMs]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(await sendMessage(text.trim(), sender.trim() || undefined));
      setText("");
    } catch (err) {
      setResult(null);
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card composer">
      <h2>New patient message</h2>
      <p className="muted">Enter or dictate a message exactly as a patient would text it. The preview updates as you type.</p>
      <label htmlFor="msg">Patient message</label>
      <textarea
        id="msg"
        value={text}
        maxLength={1000}
        rows={4}
        placeholder="e.g. My baby has a high fever"
        onChange={(e) => setText(e.target.value)}
      />
      <label htmlFor="sender">Phone number (optional, groups follow-up texts)</label>
      <input id="sender" value={sender} placeholder="+15551234567" onChange={(e) => setSender(e.target.value)} />

      {preview && (
        <div className="preview" data-testid="preview" aria-live="polite">
          <span className="muted">Preview</span> <TriageBadge triage={preview.triage} /> <span>{preview.reason}</span>
          {preview.negated.length > 0 && (
            <span className="muted">Ruled out: {preview.negated.map(signalLabel).join(", ")}</span>
          )}
        </div>
      )}

      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>
          {busy ? "Triaging..." : "Triage message"}
        </button>
        {dictation.supported && (
          <button type="button" className="btn" onClick={dictation.toggle} aria-pressed={dictation.listening}>
            {dictation.listening ? "Stop dictation" : "Dictate"}
          </button>
        )}
      </div>
      {(error || dictation.error) && <p role="alert" className="error">{error ?? dictation.error}</p>}
      {result && (
        <div className="result" data-testid="result">
          <div><TriageBadge triage={result.triage} /> <span className="muted">{result.reason}</span></div>
          <div className="section-label">Reply sent</div>
          <p>{result.guidance}</p>
        </div>
      )}
    </form>
  );
}
