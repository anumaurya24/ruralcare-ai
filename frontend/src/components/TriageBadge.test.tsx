import { render, screen } from "@testing-library/react";
import { TriageBadge } from "./TriageBadge";

it.each([
  ["EMERGENCY", "Emergency", "badge-emergency"],
  ["URGENT", "Urgent", "badge-urgent"],
  ["ROUTINE", "Routine", "badge-routine"],
] as const)("shows %s with a readable label and color class", (triage, label, cls) => {
  render(<TriageBadge triage={triage} />);
  const badge = screen.getByLabelText(`Triage level: ${label}`);
  expect(badge).toHaveTextContent(label);
  expect(badge).toHaveClass(cls);
});
