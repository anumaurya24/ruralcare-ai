import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { encounter } from "../test/fixtures";
import { EncounterQueue } from "./EncounterQueue";

const rows = [
  encounter({ id: 4, text: "cough again", status: "resolved" }),
  encounter({ id: 3, text: "heavy bleeding", triage: "EMERGENCY", reason: "Red flag: heavy bleeding", sender: "+15551234567" }),
  encounter({ id: 2, text: "and diarrhea too", triage: "URGENT", thread_id: 1, status: "acknowledged" }),
  encounter({ id: 1, text: "mild cough" }),
];

const caseIds = () => screen.getAllByRole("row").slice(1).map((r) => r.getAttribute("aria-label"));

it("puts open cases first, most severe first, and hides resolved ones", async () => {
  render(<EncounterQueue encounters={rows} onSelect={() => {}} />);
  expect(caseIds()).toEqual(["Case 3", "Case 1", "Case 2"]);
  await userEvent.click(screen.getByLabelText("Hide resolved"));
  expect(caseIds()).toHaveLength(4);
});

it("masks phone numbers and marks follow-ups", () => {
  render(<EncounterQueue encounters={rows} onSelect={() => {}} />);
  const bleeding = screen.getByLabelText("Case 3");
  expect(bleeding).toHaveTextContent("Patient ···4567");
  expect(bleeding).not.toHaveTextContent("+15551234567");
  expect(within(screen.getByLabelText("Case 2")).getByText(/follow-up to #1/)).toBeInTheDocument();
});

it("filters by triage level and searches text and phone", async () => {
  render(<EncounterQueue encounters={rows} onSelect={() => {}} />);
  await userEvent.click(screen.getByRole("button", { name: "Emergency" }));
  expect(caseIds()).toEqual(["Case 3"]);
  await userEvent.click(screen.getByRole("button", { name: "All" }));
  await userEvent.type(screen.getByLabelText("Search encounters"), "diarrhea");
  expect(caseIds()).toEqual(["Case 2"]);
  await userEvent.clear(screen.getByLabelText("Search encounters"));
  await userEvent.type(screen.getByLabelText("Search encounters"), "4567");
  expect(caseIds()).toEqual(["Case 3"]);
});

it("opens a case by click or keyboard", async () => {
  const onSelect = vi.fn();
  render(<EncounterQueue encounters={rows} onSelect={onSelect} />);
  await userEvent.click(screen.getByLabelText("Case 3"));
  expect(onSelect).toHaveBeenCalledWith(3);
  screen.getByLabelText("Case 1").focus();
  await userEvent.keyboard("{Enter}");
  expect(onSelect).toHaveBeenCalledWith(1);
});

it("highlights newly arrived rows and shows an empty state", () => {
  const { unmount } = render(<EncounterQueue encounters={rows} onSelect={() => {}} newIds={new Set([1])} />);
  expect(screen.getByLabelText("Case 1")).toHaveClass("is-new");
  unmount();
  render(<EncounterQueue encounters={[]} onSelect={() => {}} />);
  expect(screen.getByText("No messages yet.")).toBeInTheDocument();
});
