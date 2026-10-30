export type Triage = "EMERGENCY" | "URGENT" | "ROUTINE";
export type CaseStatus = "open" | "acknowledged" | "resolved";

export interface Encounter {
  id: number;
  channel: "json" | "sms";
  text: string;
  locale: string;
  rule: Triage;
  risk_score: number | null;
  triage: Triage;
  guidance: string;
  reason: string;
  signals: string[];
  duration_days: number | null;
  sender: string | null;
  thread_id: number | null;
  status: CaseStatus;
  created_at: string;
}

/** Result of POST /triage/explain (a preview; nothing is saved). */
export interface Assessment {
  rule: Triage;
  triage: Triage;
  risk_score: number | null;
  reason: string;
  signals: string[];
  negated: string[];
  duration_days: number | null;
}
