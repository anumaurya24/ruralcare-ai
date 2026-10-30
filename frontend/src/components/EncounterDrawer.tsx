import { useEffect } from "react";
import { conversation, patientLabel, signalLabel, timeOf } from "../format";
import type { CaseStatus, Encounter } from "../types";
import { TriageBadge } from "./TriageBadge";

export function EncounterDrawer({ encounter, all, onClose, onStatus }: {
  encounter: Encounter;
  all: Encounter[];
  onClose: () => void;
  onStatus: (id: number, s: CaseStatus) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const thread = conversation(all, encounter);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Case ${encounter.id} details`}>
        <div className="drawer-head">
          <div>
            <h2>{patientLabel(encounter)}</h2>
            <div className="muted">
              Case #{encounter.id} · {encounter.channel.toUpperCase()} · {timeOf(encounter.created_at)}
            </div>
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose} aria-label="Close details">✕</button>
        </div>

        <div className="tags">
          <TriageBadge triage={encounter.triage} />
          <span className={`pill pill-${encounter.status}`}>{encounter.status}</span>
        </div>

        <div>
          <div className="section-label">Why</div>
          <div>{encounter.reason}</div>
          {encounter.risk_score !== null && <div className="muted">Risk score {encounter.risk_score}</div>}
          {encounter.duration_days !== null && <div className="muted">Symptoms for {encounter.duration_days} day(s)</div>}
        </div>

        {encounter.signals.length > 0 && (
          <div>
            <div className="section-label">Symptoms recognized</div>
            <div className="tags">{encounter.signals.map((s) => <span key={s} className="tag">{signalLabel(s)}</span>)}</div>
          </div>
        )}

        <div>
          <div className="section-label">{thread.length > 1 ? `Conversation (${thread.length} messages)` : "Message"}</div>
          <ol className="timeline">
            {thread.map((m) => (
              <li key={m.id}>
                <div className="quote">{m.text}</div>
                <div className="muted">{timeOf(m.created_at)} · {m.triage.toLowerCase()}</div>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <div className="section-label">Reply sent</div>
          <div className="quote">{encounter.guidance}</div>
        </div>

        {encounter.status !== "resolved" && (
          <div className="drawer-actions">
            {encounter.status === "open" && (
              <button type="button" className="btn" onClick={() => onStatus(encounter.id, "acknowledged")}>Acknowledge</button>
            )}
            <button type="button" className="btn btn-primary" onClick={() => onStatus(encounter.id, "resolved")}>Resolve</button>
          </div>
        )}
      </aside>
    </>
  );
}
