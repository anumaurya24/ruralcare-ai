import type { Assessment, CaseStatus, Encounter } from "./types";

export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function wsUrl(path: string): string {
  return API_URL.replace(/^http/, "ws") + path;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_URL + path, init);
  if (!res.ok) {
    throw new Error(res.status === 422 ? "Please check the message and phone number." : `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export function sendMessage(text: string, sender?: string): Promise<Encounter> {
  return request<Encounter>("/twilio/webhook-json", json("POST", sender ? { text, sender } : { text }));
}

export function explain(text: string, signal?: AbortSignal): Promise<Assessment> {
  return request<Assessment>("/triage/explain", { ...json("POST", { text }), signal });
}

export function listEncounters(limit = 100): Promise<Encounter[]> {
  return request<Encounter[]>(`/encounters?limit=${limit}`);
}

export function updateStatus(id: number, status: CaseStatus): Promise<Encounter> {
  return request<Encounter>(`/encounters/${id}`, json("PATCH", { status }));
}
