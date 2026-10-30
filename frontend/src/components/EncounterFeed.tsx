import type { FeedStatus } from "../useEncounterFeed";
import type { Encounter, Triage } from "../types";
import { TriageBadge } from "./TriageBadge";

const FILTERS: Array<Triage | "ALL"> = ["ALL", "EMERGENCY", "URGENT", "ROUTINE"];

interface Props {
  encounters: Encounter[];
  status: FeedStatus;
  filter: Triage | "ALL";
  onFilter: (f: Triage | "ALL") => void;
}

export function EncounterFeed({ encounters, status, filter, onFilter }: Props) {
  const shown = filter === "ALL" ? encounters : encounters.filter((e) => e.triage === filter);
  return (
    <section className="card">
      <header className="feed-header">
        <h2>Live encounters</h2>
        <span className={`status status-${status}`} role="status">{status}</span>
      </header>
      <div className="filters" role="group" aria-label="Filter by triage level">
        {FILTERS.map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => onFilter(f)}>
            {f === "ALL" ? "All" : f[0] + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="empty">No messages yet.</p>
      ) : (
        <ul className="feed">
          {shown.map((e) => (
            <li key={e.id}>
              <TriageBadge triage={e.triage} />
              <span className="text">{e.text}</span>
              <span className="meta">{e.channel.toUpperCase()} · {new Date(e.created_at).toLocaleTimeString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
