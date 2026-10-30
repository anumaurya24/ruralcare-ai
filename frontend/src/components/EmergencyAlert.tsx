import { patientLabel, timeOf } from "../format";
import type { Encounter } from "../types";

/** Compact alert for the oldest unacknowledged emergency (no flashing). */
export function EmergencyAlert({ open, onAcknowledge, onView }: {
  open: Encounter[];
  onAcknowledge: (id: number) => void;
  onView: (id: number) => void;
}) {
  if (open.length === 0) return null;
  const first = open[open.length - 1];
  return (
    <div className="alert" role="alert">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--emergency)" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      </svg>
      <div className="alert-text">
        <strong>
          {open.length} emergency {open.length === 1 ? "case needs" : "cases need"} attention
        </strong>
        <span>{first.reason.replace(/^Red flag: /, "")} · {patientLabel(first)} · {timeOf(first.created_at)}</span>
      </div>
      <button type="button" className="btn btn-sm" onClick={() => onView(first.id)}>View</button>
      <button type="button" className="btn btn-sm btn-danger" onClick={() => onAcknowledge(first.id)}>Acknowledge</button>
    </div>
  );
}
