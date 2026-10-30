import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { encounter } from "../test/fixtures";
import type { Triage } from "../types";
import { EncounterFeed } from "./EncounterFeed";

const rows = [
  encounter({ id: 3, text: "heavy bleeding", triage: "EMERGENCY" }),
  encounter({ id: 2, text: "infant high fever", triage: "URGENT" }),
  encounter({ id: 1, text: "mild cough" }),
];

function Harness() {
  const [filter, setFilter] = useState<Triage | "ALL">("ALL");
  return <EncounterFeed encounters={rows} status="live" filter={filter} onFilter={setFilter} />;
}

it("lists every encounter and the connection status", () => {
  render(<Harness />);
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  expect(screen.getByRole("status")).toHaveTextContent("live");
});

it("filters by triage level", async () => {
  render(<Harness />);
  await userEvent.click(screen.getByRole("button", { name: "Emergency" }));
  expect(screen.getByRole("button", { name: "Emergency" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  expect(screen.getByText("heavy bleeding")).toBeInTheDocument();
  expect(screen.queryByText("mild cough")).not.toBeInTheDocument();
});

it("shows an empty state", () => {
  render(<EncounterFeed encounters={[]} status="offline" filter="ALL" onFilter={() => {}} />);
  expect(screen.getByText("No messages yet.")).toBeInTheDocument();
});
