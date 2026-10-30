import type { Encounter, TriageResult } from "./types";

export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function wsUrl(path: string): string {
  return API_URL.replace(/^http/, "ws") + path;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_URL + path, init);
  if (!res.ok) {
    throw new Error(res.status === 422 ? "Please enter a message (up to 1000 characters)." : `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function sendMessage(text: string): Promise<TriageResult> {
  return request<TriageResult>("/twilio/webhook-json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

export function listEncounters(limit = 50): Promise<Encounter[]> {
  return request<Encounter[]>(`/encounters?limit=${limit}`);
}
