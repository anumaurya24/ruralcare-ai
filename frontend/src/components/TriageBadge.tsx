import type { Triage } from "../types";

const LABELS: Record<Triage, string> = {
  EMERGENCY: "Emergency",
  URGENT: "Urgent",
  ROUTINE: "Routine",
};

export function TriageBadge({ triage }: { triage: Triage }) {
  return (
    <span className={`badge badge-${triage.toLowerCase()}`} aria-label={`Triage level: ${LABELS[triage]}`}>
      {LABELS[triage]}
    </span>
  );
}
