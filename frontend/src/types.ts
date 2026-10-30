export type Triage = "EMERGENCY" | "URGENT" | "ROUTINE";

export interface Encounter {
  id: number;
  channel: "json" | "sms";
  text: string;
  locale: string;
  rule: Triage;
  risk_score: number | null;
  triage: Triage;
  guidance: string;
  created_at: string;
}

export interface TriageResult {
  id: number;
  triage: Triage;
  guidance: string;
}
