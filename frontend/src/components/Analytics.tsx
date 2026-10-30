import { signalLabel } from "../format";
import type { Encounter } from "../types";

function Bars({ rows }: { rows: Array<{ label: string; value: number; tone?: string }> }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="bars">
      {rows.map((r) => (
        <div key={r.label} className="bar">
          <span>{r.label}</span>
          <div className="bar-track" aria-hidden="true">
            <div className={`bar-fill ${r.tone ?? ""}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span aria-label={`${r.label}: ${r.value}`}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Analytics({ encounters }: { encounters: Encounter[] }) {
  const counts = new Map<string, number>();
  encounters.forEach((e) => e.signals.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1)));
  const topSignals = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const by = (f: (e: Encounter) => boolean) => encounters.filter(f).length;

  return (
    <div className="grid-2">
      <section className="card">
        <h2>Triage levels</h2>
        <Bars rows={[
          { label: "Emergency", value: by((e) => e.triage === "EMERGENCY"), tone: "emergency" },
          { label: "Urgent", value: by((e) => e.triage === "URGENT"), tone: "urgent" },
          { label: "Routine", value: by((e) => e.triage === "ROUTINE"), tone: "routine" },
        ]} />
      </section>
      <section className="card">
        <h2>Case status</h2>
        <Bars rows={[
          { label: "Open", value: by((e) => e.status === "open") },
          { label: "Acknowledged", value: by((e) => e.status === "acknowledged") },
          { label: "Resolved", value: by((e) => e.status === "resolved") },
        ]} />
      </section>
      <section className="card">
        <h2>Most reported symptoms</h2>
        {topSignals.length ? <Bars rows={topSignals.map(([s, n]) => ({ label: signalLabel(s), value: n }))} />
          : <p className="empty">No symptoms recorded yet.</p>}
      </section>
      <section className="card">
        <h2>Channels</h2>
        <Bars rows={[
          { label: "SMS", value: by((e) => e.channel === "sms") },
          { label: "Dashboard", value: by((e) => e.channel === "json") },
        ]} />
      </section>
    </div>
  );
}
