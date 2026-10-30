# RuralCare AI: SMS Health Triage

RuralCare AI triages health messages sent by SMS. Each message gets a triage level
(**Emergency**, **Urgent**, or **Routine**), a plain-English reason, and guidance texted back to the sender.
Clinic staff work the cases from a live React dashboard that updates over a WebSocket.

> RuralCare gives general guidance only. It is not a diagnosis and does not replace a clinician.
> See [docs/safety-and-ethics.md](docs/safety-and-ethics.md).

## Features

- **Symptom understanding, not keyword matching.** Phrases map to symptom signals ("can't breathe",
  "passed out", "burning up", "103 F"), negations are respected ("no fever, but I fainted"), and
  symptom duration is read from the text ("for 4 days", "since yesterday").
- **Explainable decisions.** Every case shows why, e.g. *Red flag: chest pain + shortness of breath*
  or *Risk score 0.7 is at or above 0.6*, plus the symptoms recognized and ruled out.
- **Patient conversations.** Follow-up texts from the same phone number within 6 hours are triaged
  together, so "my baby is vomiting" followed by "and diarrhea too" escalates to Urgent. Phone formats
  are normalized ("+1 (555) 000-1111" = "15550001111").
- **Case workflow.** Staff acknowledge and resolve cases; every open dashboard sees the change instantly.
- **Dashboard.** KPI cards, an emergency alert, a searchable patient queue (open emergencies first),
  a details drawer with the full conversation and the reply sent, an analytics page, dark mode,
  and a phone-friendly layout. Phone numbers are masked to the last 4 digits on screen.
- **Live triage preview and voice dictation.** The message composer previews the decision as you type
  and supports speech-to-text in browsers with the Web Speech API (Chrome, Edge, Safari).
- **Safety.** Red flags can never be downgraded by the risk score, replies are fixed reviewed text,
  and self-harm messages include the 988 crisis line.

## How it works

```
SMS ──> Twilio ──> POST /twilio/webhook ───┐
                                            ├─> signals (phrases, negation, duration)
Dashboard ──> POST /twilio/webhook-json ───┘        │  + earlier texts in the conversation
                                                     v
                         red-flag rules ─> urgent rules ─> risk score ─> decision + reason + guidance
                                                                              │
                                              saved to SQLite (encounters) <──┤
Dashboards <── WebSocket /ws/encounters <── broadcast (new case / status change)
```

All phrases, rules, and score weights live in [`backend/triage/rules.yaml`](backend/triage/rules.yaml),
so clinical staff can review them without reading code.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/healthz` | Health check |
| POST | `/twilio/webhook` | Twilio inbound SMS (form fields `Body`, `From`); replies with TwiML so Twilio texts the guidance back |
| POST | `/twilio/webhook-json` | `{"text", "locale"?, "sender"?}` → the saved encounter (text 1-1000 chars) |
| POST | `/triage/explain` | `{"text"}` → decision, reason, signals, negated signals; nothing is saved |
| GET | `/encounters?limit=&status=&sender=` | Encounters, newest first |
| GET | `/encounters/{id}` | One encounter (404 if missing) |
| PATCH | `/encounters/{id}` | `{"status": "open" \| "acknowledged" \| "resolved"}` |
| GET | `/stats` | Totals by triage level and open emergencies |
| WS | `/ws/encounters` | `{"type": "encounter" \| "update", "data": {...}}` for every new or changed case |

Interactive docs: http://localhost:8000/docs

## Run it locally

Backend (Python 3.11+):

```bash
python -m venv .venv
.venv/Scripts/activate          # macOS/Linux: source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Dashboard (Node 20+):

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

Settings come from environment variables (see `backend/.env.example`): `DATABASE_URL`
(default `sqlite:///./ruralcare.db`) and `CORS_ORIGINS` (default `http://localhost:5173`).
Set `VITE_API_URL` for the dashboard if the API is not on `http://localhost:8000`.
If you ran an older version, delete `ruralcare.db` so the new columns are created.

To receive real texts, point a Twilio number's "A message comes in" webhook at
`https://<your-host>/twilio/webhook`. A step-by-step walkthrough is in [docs/demo-script.md](docs/demo-script.md).

## Tests

```bash
pytest                          # 47 backend tests: signals, negation, duration, rules, threads, API, WebSocket
cd frontend && npm test         # 22 UI tests (Vitest + React Testing Library)
```

GitHub Actions runs both suites and the TypeScript build on every push and pull request.

## Project layout

```
backend/
  main.py              FastAPI app, CORS, routers
  service.py           conversation context -> triage -> save -> broadcast; phone normalization
  realtime.py          WebSocket connection manager
  routers/             health, twilio (SMS + JSON), encounters (REST, stats, explain, WebSocket)
  triage/engine.py     signal extraction, negation, duration, rules, risk score, explanation
  triage/rules.yaml    phrases, red-flag and urgent rules, risk weights
  llm/generator.py     reply text per triage level (988 line for self-harm)
  db/models.py         SQLAlchemy Encounter model and session
  tests/               pytest suite
frontend/src/
  App.tsx              pages, theme, arrival highlight
  components/          Sidebar, KpiCards, EmergencyAlert, EncounterQueue, EncounterDrawer,
                       MessageForm, Analytics, TriageBadge (+ tests)
  useEncounterFeed.ts  history + live WebSocket feed with reconnect + status updates
  useDictation.ts      Web Speech API dictation
```

## Roadmap

- Replace the keyword risk score with a trained classifier
- Multilingual phrases and replies (the `locale` field is already stored)
- Staff sign-in for the dashboard before any real patient data is used
