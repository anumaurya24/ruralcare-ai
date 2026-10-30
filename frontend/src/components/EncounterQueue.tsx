import { useState } from "react";
import { patientLabel, timeOf } from "../format";
import type { Encounter, Triage } from "../types";
import { TriageBadge } from "./TriageBadge";

const FILTERS: Array<Triage | "ALL"> = ["ALL", "EMERGENCY", "URGENT", "ROUTINE"];
const SEVERITY: Record<Triage, number> = { EMERGENCY: 0, URGENT: 1, ROUTINE: 2 };

interface Props {
  encounters: Encounter[];
  onSelect: (id: number) => void;
  newIds?: Set<number>;
  title?: string;
  limit?: number;
}

/** Searchable patient queue: open emergencies first, then newest. */
export function EncounterQueue({ encounters, onSelect, newIds, title = "Patient queue", limit }: Props) {
  const [filter, setFilter] = useState<Triage | "ALL">("ALL");
  const [hideResolved, setHideResolved] = useState(true);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const rows = encounters
    .filter((e) => filter === "ALL" || e.triage === filter)
    .filter((e) => !hideResolved || e.status !== "resolved")
    .filter((e) => !q || [e.text, e.reason, e.sender ?? "", patientLabel(e)].some((s) => s.toLowerCase().includes(q)))
    .sort((a, b) => {
      const openA = a.status === "open" ? 0 : 1;
      const openB = b.status === "open" ? 0 : 1;
      return openA - openB || SEVERITY[a.triage] - SEVERITY[b.triage] || b.id - a.id;
    })
    .slice(0, limit);

  return (
    <section className="card">
      <div className="queue-head">
        <h2>{title}</h2>
        <div className="toolbar">
          <input type="search" placeholder="Search messages or phone" aria-label="Search encounters" value={query}
            onChange={(e) => setQuery(e.target.value)} />
          <div className="toolbar" role="group" aria-label="Filter by triage level">
            {FILTERS.map((f) => (
              <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === "ALL" ? "All" : f[0] + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={hideResolved} onChange={(e) => setHideResolved(e.target.checked)} /> Hide resolved
          </label>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="empty">No messages yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Patient</th>
              <th className="hide-sm">Message</th>
              <th className="hide-sm">Reason</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} aria-label={`Case ${e.id}`} tabIndex={0}
                className={`row${newIds?.has(e.id) ? " is-new" : ""}${e.status === "resolved" ? " is-resolved" : ""}`}
                onClick={() => onSelect(e.id)}
                onKeyDown={(k) => (k.key === "Enter" || k.key === " ") && onSelect(e.id)}>
                <td><TriageBadge triage={e.triage} /></td>
                <td>
                  <div className="patient">{patientLabel(e)}</div>
                  <div className="muted">{e.channel.toUpperCase()}{e.thread_id && ` · follow-up to #${e.thread_id}`}</div>
                </td>
                <td className="hide-sm"><div className="msg">{e.text}</div></td>
                <td className="hide-sm muted">{e.reason}</td>
                <td className="muted">{timeOf(e.created_at)}</td>
                <td><span className={`pill pill-${e.status}`}>{e.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
