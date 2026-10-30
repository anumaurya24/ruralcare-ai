import { act, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";
import { FakeWebSocket } from "./test/fakeWebSocket";
import { encounter, jsonResponse } from "./test/fixtures";

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeWebSocket);
});

it("loads recent encounters, then adds live ones pushed over the WebSocket", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([encounter()])));
  render(<App />);

  expect(await screen.findByText("mild cough")).toBeInTheDocument();
  const ws = FakeWebSocket.instances[0];
  expect(ws.url).toBe("ws://localhost:8000/ws/encounters");

  act(() => ws.open());
  expect(screen.getByRole("status")).toHaveTextContent("live");

  act(() => ws.push({ type: "encounter", data: encounter({ id: 2, text: "loss of consciousness", triage: "EMERGENCY" }) }));
  expect(screen.getByText("loss of consciousness")).toBeInTheDocument();
  expect(screen.getByText(/2 messages, 1 emergencies/)).toBeInTheDocument();
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
