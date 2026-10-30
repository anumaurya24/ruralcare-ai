import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { assessment, encounter, jsonResponse, routeFetch } from "../test/fixtures";
import { MessageForm } from "./MessageForm";

it("disables submit until a message is typed", async () => {
  render(<MessageForm />);
  const button = screen.getByRole("button", { name: "Triage message" });
  expect(button).toBeDisabled();
  await userEvent.type(screen.getByLabelText("Patient message"), "   ");
  expect(button).toBeDisabled();
});

it("shows a live triage preview while typing, including ruled-out symptoms", async () => {
  const fetchMock = vi.fn(routeFetch({
    "/triage/explain": assessment({ reason: "Red flag: loss of consciousness", negated: ["fever"] }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  render(<MessageForm previewDelayMs={0} />);

  await userEvent.type(screen.getByLabelText("Patient message"), "no fever but I fainted");

  const preview = await screen.findByTestId("preview");
  expect(preview).toHaveTextContent("Red flag: loss of consciousness");
  expect(preview).toHaveTextContent("Ruled out: fever");
});

it("posts the message with the phone number and shows the result", async () => {
  const fetchMock = vi.fn(routeFetch({
    "/triage/explain": assessment(),
    "/twilio/webhook-json": encounter({ id: 7, triage: "EMERGENCY", guidance: "This could be serious.",
      reason: "Red flag: chest pain + shortness of breath" }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  render(<MessageForm previewDelayMs={0} />);

  await userEvent.type(screen.getByLabelText("Patient message"), " chest pain and shortness of breath ");
  await userEvent.type(screen.getByLabelText(/Phone number/), "+15551234567");
  await userEvent.click(screen.getByRole("button", { name: "Triage message" }));

  const result = await screen.findByTestId("result");
  expect(result).toHaveTextContent("This could be serious.");
  expect(result).toHaveTextContent("Red flag: chest pain + shortness of breath");
  const post = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/twilio/webhook-json"))!;
  expect(JSON.parse((post[1] as RequestInit).body as string)).toEqual({
    text: "chest pain and shortness of breath",
    sender: "+15551234567",
  });
  expect(screen.getByLabelText("Patient message")).toHaveValue("");
});

it("shows a friendly error when the API rejects the message", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: [] }, 422)));
  render(<MessageForm previewDelayMs={10_000} />);

  await userEvent.type(screen.getByLabelText("Patient message"), "cough");
  await userEvent.click(screen.getByRole("button", { name: "Triage message" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Please check the message and phone number.");
  expect(screen.queryByTestId("result")).not.toBeInTheDocument();
});

describe("voice dictation", () => {
  class FakeRecognition {
    static last: FakeRecognition;
    lang = "";
    interimResults = true;
    continuous = false;
    onresult: ((e: unknown) => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    started = false;
    constructor() {
      FakeRecognition.last = this;
    }
    start() {
      this.started = true;
    }
    stop() {
      this.onend?.();
    }
    say(transcript: string) {
      const result = Object.assign([{ transcript }], { isFinal: true });
      this.onresult?.({ resultIndex: 0, results: [result] });
    }
  }

  it("is hidden when the browser has no speech recognition", () => {
    render(<MessageForm />);
    expect(screen.queryByRole("button", { name: "Dictate" })).not.toBeInTheDocument();
  });

  it("types spoken words into the message box", async () => {
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
    vi.stubGlobal("fetch", vi.fn(routeFetch({ "/triage/explain": assessment() })));
    render(<MessageForm previewDelayMs={10_000} />);

    await userEvent.click(screen.getByRole("button", { name: "Dictate" }));
    expect(FakeRecognition.last.started).toBe(true);
    expect(screen.getByRole("button", { name: "Stop dictation" })).toHaveAttribute("aria-pressed", "true");

    const { act } = await import("@testing-library/react");
    act(() => FakeRecognition.last.say("my baby has a high fever"));
    expect(screen.getByLabelText("Patient message")).toHaveValue("my baby has a high fever");

    await userEvent.click(screen.getByRole("button", { name: "Stop dictation" }));
    expect(screen.getByRole("button", { name: "Dictate" })).toBeInTheDocument();
  });
});
