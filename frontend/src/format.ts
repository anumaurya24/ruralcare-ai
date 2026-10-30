import type { Encounter } from "./types";

/** Show only the last 4 digits of a phone number on screen. */
export function patientLabel(e: Pick<Encounter, "id" | "sender">): string {
  return e.sender ? `Patient ···${e.sender.slice(-4)}` : `Walk-in #${e.id}`;
}

export function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export const signalLabel = (s: string) => s.replace(/_/g, " ");

/** All messages in the same conversation as `e`, oldest first. */
export function conversation(all: Encounter[], e: Encounter): Encounter[] {
  const root = e.thread_id ?? e.id;
  return all.filter((x) => x.id === root || x.thread_id === root).sort((a, b) => a.id - b.id);
}
