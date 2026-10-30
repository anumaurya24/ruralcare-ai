# RuralCare AI: SMS Health Triage

RuralCare AI triages health messages sent by SMS. Each message gets a triage level
(**Emergency**, **Urgent**, or **Routine**) and plain-language guidance texted back to the sender.
A React dashboard shows clinic staff every message as it arrives, over a WebSocket.

> RuralCare gives general guidance only. It is not a diagnosis and does not replace a clinician.
> See [docs/safety-and-ethics.md](docs/safety-and-ethics.md).

## How it works

```
SMS ──> Twilio ──> POST /twilio/webhook ─┐
                                          ├─> rules engine ─> risk score ─> decision ─> guidance
Dashboard form ──> POST /twilio/webhook-json ┘                                     │
                                                                                     ├─> saved to SQLite (encounters)
Dashboard <── WebSocket /ws/encounters <── broadcast ───────────────────────────────┘
```

1. **Rules first.** `backend/triage/rules.yaml` lists red flags (chest pain with shortness of breath,
   heavy bleeding, loss of consciousness) and urgent signs (high fever in an infant, severe dehydration).
   A message matches a rule when it contains every keyword in it.
2. **Risk score second.** If no rule fires, a keyword score (fever, cough, breathing) can raise a
   routine message to urgent at 0.6 or above. Rules always win over the score, so a red flag can
   never be downgraded.
3. **Guidance.** `backend/llm/generator.py` returns a fixed, reviewed message for each level.
4. **Record and broadcast.** Each encounter is stored and pushed to every open dashboard.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/healthz` | Health check |
| POST | `/twilio/webhook` | Twilio inbound SMS (form field `Body`); replies with TwiML so Twilio texts the guidance back |
| POST | `/twilio/webhook-json` | `{"text": "...", "locale": "en"}` → `{"id", "triage", "guidance"}` (text 1-1000 chars) |
| GET | `/encounters?limit=50` | Most recent encounters, newest first |
| GET | `/encounters/{id}` | One encounter (404 if missing) |
| WS | `/ws/encounters` | Live feed: `{"type": "encounter", "data": {...}}` per new message |

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

To receive real texts, point a Twilio number's "A message comes in" webhook at
`https://<your-host>/twilio/webhook`.

## Tests

```bash
pytest                          # backend: rules, scoring, API validation, TwiML, WebSocket feed
cd frontend && npm test         # dashboard UI tests (Vitest + React Testing Library)
```

GitHub Actions runs both suites and the TypeScript build on every push and pull request.

## Project layout

```
backend/
  main.py              FastAPI app, CORS, routers
  service.py           triage -> save -> broadcast
  realtime.py          WebSocket connection manager
  routers/             health, twilio (SMS + JSON), encounters (REST + WebSocket)
  triage/engine.py     rules engine, risk score, decision
  triage/rules.yaml    red-flag and urgent rules
  llm/generator.py     guidance text per triage level
  db/models.py         SQLAlchemy Encounter model and session
  tests/               pytest suite
frontend/
  src/components/      MessageForm, EncounterFeed, TriageBadge (+ tests)
  src/useEncounterFeed.ts   history + live WebSocket feed with reconnect
```

## Roadmap

- Replace the keyword risk score with a trained classifier
- Multilingual guidance (the `locale` field is already stored)
- Staff sign-in for the dashboard before any real patient data is used
