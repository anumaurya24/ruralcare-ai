import type { Encounter } from "../types";

export function encounter(over: Partial<Encounter> = {}): Encounter {
  return {
    id: 1,
    channel: "sms",
    text: "mild cough",
    locale: "en",
    rule: "ROUTINE",
    risk_score: 0.2,
    triage: "ROUTINE",
    guidance: "Home care is appropriate today.",
    created_at: "2026-10-30T12:00:00+00:00",
    ...over,
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
