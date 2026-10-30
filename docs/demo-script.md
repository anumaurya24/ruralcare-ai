# Demo script (about 3 minutes)

1. Start the API (`uvicorn backend.main:app --port 8000`) and the dashboard (`cd frontend && npm run dev`).
   Open http://localhost:5173. The feed status should read **LIVE**.
2. In **Patient message**, send `mild cough since yesterday`. Result: **Routine** with home-care guidance.
3. Send `fever and trouble catching my breath`. No rule matches, but the risk score passes 0.6, so the
   result is **Urgent**.
4. Send `chest pain and shortness of breath`. A red-flag rule fires and the result is **Emergency**.
5. Simulate a real text from another terminal and watch it appear in the feed without refreshing:

   ```bash
   curl -X POST http://localhost:8000/twilio/webhook -d "Body=my infant has a high fever"
   ```

   The response is TwiML, the format Twilio uses to text the guidance back.
6. Click **Emergency** in the filter bar to show only emergencies.
7. Stop and restart the API. The feed shows **OFFLINE**, then reconnects by itself.
