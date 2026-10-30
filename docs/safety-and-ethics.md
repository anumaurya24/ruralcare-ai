# Safety and ethics

RuralCare AI is a prototype. These are the safety choices built into it and the limits that remain.

## Built in

- **Red flags cannot be overridden.** Rules in `backend/triage/rules.yaml` decide first. The risk
  score is only computed when no rule fires, and it can only raise a message from routine to urgent,
  never lower it.
- **Fixed guidance text.** Replies come from a small set of written messages in
  `backend/llm/generator.py`, not from free-form model output, so the system cannot invent medical advice.
- **Every emergency reply says to seek care now** and to call emergency services. Messages about
  self-harm also get the 988 Suicide & Crisis Lifeline.
- **Conversations never lose a red flag.** A follow-up text is triaged together with the earlier texts
  in the same conversation, so "thanks" after an emergency is still treated as an emergency.
- **Explainable decisions.** Each case stores the reason, the symptoms recognized, and the symptoms
  ruled out by negation, so staff can see exactly why it was triaged that way.
- **Privacy on screen.** The dashboard shows only the last 4 digits of a phone number.
- **Input limits.** Messages are capped at 1000 characters and validated before triage; an empty SMS
  gets a request to describe symptoms instead of a triage result.
- **Audit trail.** Every message, the rule that matched, the risk score, and the final decision are
  stored, so decisions can be reviewed later.

## Known limits

- Phrase matching misses misspellings, unusual wording, and other languages, and negation handling
  is a short-range heuristic (it stops at a new subject such as "I" or "my").
- The risk score is a hand-set keyword heuristic, not a validated clinical model.
- The dashboard has no sign-in yet. Do not use it with real patient data until access control,
  encryption at rest, and a data-retention policy are in place.
- Guidance is general information, not a diagnosis, and should be reviewed by a clinician before any
  real deployment.
