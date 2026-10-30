# Demo script (about 4 minutes)

1. Start the API (`uvicorn backend.main:app --port 8000`) and the dashboard (`cd frontend && npm run dev`).
   Open http://localhost:5173. The top bar shows **Live**.
2. Go to **Messages**. Type `no fever but I fainted` and watch the preview: **Emergency**,
   "Red flag: loss of consciousness", and "Ruled out: fever". Click **Triage message**.
3. Type `fever and vomiting for 4 days`. No rule fires, but the risk score reaches 0.7, so it is **Urgent**.
4. Simulate real texts from another terminal and watch them arrive on the **Dashboard** with a short highlight:

   ```bash
   curl -X POST http://localhost:8000/twilio/webhook --data-urlencode "Body=my baby is vomiting" --data-urlencode "From=+15550001111"
   curl -X POST http://localhost:8000/twilio/webhook --data-urlencode "Body=and diarrhea too" --data-urlencode "From=+15550001111"
   curl -X POST http://localhost:8000/twilio/webhook --data-urlencode "Body=chest pain and I can barely catch my breath" --data-urlencode "From=+15552223333"
   ```

   The second text joins the first conversation and escalates it to **Urgent**. The third raises the
   emergency alert, the sidebar badge, and the browser tab count. Each response is TwiML, the format
   Twilio uses to text the reply back.
5. Click the follow-up row to open the drawer: reason, symptoms recognized, the whole conversation,
   and the reply that was sent. Click **Resolve**.
6. Open the dashboard in a second browser window and click **Acknowledge** on the alert in one window.
   The other window updates instantly.
7. Visit **Analytics** for triage levels, case status, and the most reported symptoms, and
   **Settings** to switch to dark mode.
8. Stop and restart the API. The status shows **Offline**, then reconnects by itself.
