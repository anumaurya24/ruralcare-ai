import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import App from "./App";
import { FakeWebSocket } from "./test/fakeWebSocket";
import { encounter, jsonResponse } from "./test/fixtures";

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeWebSocket);
  document.documentElement.removeAttribute("data-theme");
  localStorage.clear();
});

async function renderApp(history: unknown[] = []) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(history)));
  render(<App />);
  await act(async () => {}); // let the history request settle
  return FakeWebSocket.instances[0];
}

it("loads recent encounters, then adds live ones pushed over the WebSocket", async () => {
  const ws = await renderApp([encounter()]);
  expect(screen.getByLabelText("Case 1")).toHaveTextContent("mild cough");
  expect(ws.url).toBe("ws://localhost:8000/ws/encounters");

  act(() => ws.open());
  expect(screen.getByRole("status")).toHaveTextContent("live");

  act(() => ws.push({ type: "encounter", data: encounter({ id: 2, text: "loss of consciousness", triage: "EMERGENCY" }) }));
  expect(screen.getByLabelText("Case 2")).toHaveClass("is-new");
  expect(screen.getByLabelText("Case 1")).not.toHaveClass("is-new");
  expect(screen.getByTestId("kpi-total")).toHaveTextContent("02");
  expect(screen.getByTestId("kpi-emergency")).toHaveTextContent("01");
});

it("raises an emergency alert and clears it when a teammate acknowledges the case", async () => {
  const ws = await renderApp();
  const emergency = encounter({ id: 5, text: "heavy bleeding", triage: "EMERGENCY", reason: "Red flag: heavy bleeding" });

  act(() => ws.push({ type: "encounter", data: emergency }));
  expect(screen.getByRole("alert")).toHaveTextContent("1 emergency case needs attention");
  expect(screen.getByRole("alert")).toHaveTextContent("heavy bleeding");
  expect(document.title).toBe("(1) RuralCare AI");
  expect(screen.getByLabelText("1 open emergencies")).toBeInTheDocument();

  act(() => ws.push({ type: "update", data: { ...emergency, status: "acknowledged" } }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(within(screen.getByLabelText("Case 5")).getByText("acknowledged")).toBeInTheDocument();
});

it("acknowledges from the alert through the API", async () => {
  const emergency = encounter({ id: 9, text: "seizure", triage: "EMERGENCY" });
  const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) =>
    init?.method === "PATCH" ? jsonResponse({ ...emergency, status: "acknowledged" }) : jsonResponse([emergency]));
  vi.stubGlobal("fetch", fetchMock);
  render(<App />);

  const alert = await screen.findByRole("alert");
  await userEvent.click(within(alert).getByRole("button", { name: "Acknowledge" }));

  const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH")!;
  expect(String(patch[0])).toBe("http://localhost:8000/encounters/9");
  expect(JSON.parse(patch[1]!.body as string)).toEqual({ status: "acknowledged" });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("opens a details drawer with the whole conversation and resolves the case", async () => {
  const first = encounter({ id: 1, text: "my baby is vomiting", sender: "+15550001111" });
  const followUp = encounter({ id: 2, text: "and diarrhea", sender: "+15550001111", thread_id: 1, triage: "URGENT",
    reason: "Urgent sign: vomiting + diarrhea + infant", signals: ["diarrhea", "infant", "vomiting"],
    guidance: "Please see a clinician within 24–48 hours." });
  const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) =>
    init?.method === "PATCH" ? jsonResponse({ ...followUp, status: "resolved" }) : jsonResponse([followUp, first]));
  vi.stubGlobal("fetch", fetchMock);
  render(<App />);

  await userEvent.click(await screen.findByLabelText("Case 2"));
  const drawer = screen.getByRole("dialog", { name: "Case 2 details" });
  expect(drawer).toHaveTextContent("Urgent sign: vomiting + diarrhea + infant");
  expect(drawer).toHaveTextContent("Conversation (2 messages)");
  expect(within(drawer).getByText("my baby is vomiting")).toBeInTheDocument();
  expect(within(drawer).getByText("infant")).toBeInTheDocument();
  expect(drawer).toHaveTextContent("Please see a clinician within 24–48 hours.");

  await userEvent.click(within(drawer).getByRole("button", { name: "Resolve" }));
  expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Resolve" })).not.toBeInTheDocument();
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("navigates between pages from the sidebar", async () => {
  await renderApp([encounter({ signals: ["cough"] })]);
  const nav = screen.getByRole("navigation", { name: "Main" });

  await userEvent.click(within(nav).getByRole("button", { name: "Messages" }));
  expect(within(nav).getByRole("button", { name: "Messages" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByLabelText("Patient message")).toBeInTheDocument();

  await userEvent.click(within(nav).getByRole("button", { name: "Analytics" }));
  expect(screen.getByText("Most reported symptoms")).toBeInTheDocument();
  expect(screen.getByLabelText("cough: 1")).toBeInTheDocument();

  await userEvent.click(within(nav).getByRole("button", { name: "Dashboard" }));
  await userEvent.click(screen.getByRole("button", { name: "New message" }));
  expect(screen.getByRole("heading", { name: "Messages" })).toBeInTheDocument();
});

it("switches to dark mode and remembers it", async () => {
  await renderApp();
  await userEvent.click(screen.getByRole("button", { name: "Settings" }));
  await userEvent.click(screen.getByRole("checkbox", { name: "Dark mode" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem("ruralcare-theme")).toBe("dark");
});

it("reconnects after the socket drops", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));
  render(<App />);

  act(() => FakeWebSocket.instances[0].drop());
  expect(screen.getByRole("status")).toHaveTextContent("offline");
  await act(async () => {
    vi.advanceTimersByTime(3000);
  });
  expect(FakeWebSocket.instances).toHaveLength(2);
  vi.useRealTimers();
});

it("shows an error when the history cannot load", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 500)));
  render(<App />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load messages: Request failed (500)");
});
