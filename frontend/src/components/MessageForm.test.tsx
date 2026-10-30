import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse } from "../test/fixtures";
import { MessageForm } from "./MessageForm";

it("disables submit until a message is typed", async () => {
  render(<MessageForm />);
  const button = screen.getByRole("button", { name: "Triage message" });
  expect(button).toBeDisabled();
  await userEvent.type(screen.getByLabelText("Patient message"), "   ");
  expect(button).toBeDisabled();
});

it("posts the message and shows the triage result", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    jsonResponse({ id: 7, triage: "EMERGENCY", guidance: "This could be serious." }),
  );
  vi.stubGlobal("fetch", fetchMock);
  render(<MessageForm />);

  await userEvent.type(screen.getByLabelText("Patient message"), " chest pain and shortness of breath ");
  await userEvent.click(screen.getByRole("button", { name: "Triage message" }));

  expect(await screen.findByTestId("result")).toHaveTextContent("This could be serious.");
  expect(screen.getByLabelText("Triage level: Emergency")).toBeInTheDocument();
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("http://localhost:8000/twilio/webhook-json");
  expect(JSON.parse(init.body)).toEqual({ text: "chest pain and shortness of breath" });
  expect(screen.getByLabelText("Patient message")).toHaveValue("");
});

it("shows a friendly error when the API rejects the message", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: [] }, 422)));
  render(<MessageForm />);

  await userEvent.type(screen.getByLabelText("Patient message"), "cough");
  await userEvent.click(screen.getByRole("button", { name: "Triage message" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Please enter a message");
  expect(screen.queryByTestId("result")).not.toBeInTheDocument();
});
