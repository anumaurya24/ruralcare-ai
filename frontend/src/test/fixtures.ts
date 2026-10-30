import type { Assessment, Encounter } from "../types";

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
    reason: "No warning signs (risk score 0.2)",
    signals: ["cough"],
    duration_days: null,
    sender: null,
    thread_id: null,
    status: "open",
    created_at: "2026-10-30T12:00:00+00:00",
    ...over,
  };
}

export function assessment(over: Partial<Assessment> = {}): Assessment {
  return {
    rule: "EMERGENCY",
    triage: "EMERGENCY",
    risk_score: null,
    reason: "Red flag: chest pain + shortness of breath",
    signals: ["chest_pain", "shortness_of_breath"],
    negated: [],
    duration_days: null,
    ...over,
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** fetch mock that answers by URL path. */
export function routeFetch(routes: Record<string, unknown>) {
  return async (input: RequestInfo | URL, _init?: RequestInit) => {
    const path = new URL(String(input)).pathname;
    const key = Object.keys(routes).find((k) => path === k || path.startsWith(k + "/"));
    return key ? jsonResponse(routes[key]) : jsonResponse({}, 404);
  };
}
