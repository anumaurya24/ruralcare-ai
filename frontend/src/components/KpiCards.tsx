import type { Encounter } from "../types";

export function KpiCards({ encounters }: { encounters: Encounter[] }) {
  const count = (f: (e: Encounter) => boolean) => encounters.filter(f).length;
  const cards = [
    { key: "total", label: "Total messages", value: encounters.length },
    { key: "emergency", label: "Emergency", value: count((e) => e.triage === "EMERGENCY") },
    { key: "urgent", label: "Urgent", value: count((e) => e.triage === "URGENT") },
    { key: "routine", label: "Routine", value: count((e) => e.triage === "ROUTINE") },
    { key: "open", label: "Open cases", value: count((e) => e.status === "open") },
  ];
  return (
    <section className="kpis" aria-label="Summary">
      {cards.map((c) => (
        <div key={c.key} className={`card kpi kpi-${c.key}`}>
          <span className="kpi-label">{c.label}</span>
          <span className="kpi-value" data-testid={`kpi-${c.key}`}>{String(c.value).padStart(2, "0")}</span>
        </div>
      ))}
    </section>
  );
}
