def test_healthz(client):
    assert client.get("/healthz").json() == {"status": "ok"}


def test_json_webhook_emergency(client):
    r = client.post("/twilio/webhook-json", json={"text": "chest pain and shortness of breath"})
    assert r.status_code == 200
    body = r.json()
    assert body["triage"] == "EMERGENCY"
    assert body["reason"] == "Red flag: chest pain + shortness of breath"
    assert body["status"] == "open"
    assert "seek care immediately" in body["guidance"]


def test_self_harm_reply_includes_crisis_line(client):
    body = client.post("/twilio/webhook-json", json={"text": "I want to kill myself"}).json()
    assert body["triage"] == "EMERGENCY" and "988" in body["guidance"]


def test_routine_reply_asks_for_duration_when_unknown(client):
    assert "how many days" in client.post("/twilio/webhook-json", json={"text": "mild cough"}).json()["guidance"]
    assert "how many days" not in client.post("/twilio/webhook-json",
                                               json={"text": "mild cough for 2 days"}).json()["guidance"]


def test_json_webhook_validation(client):
    assert client.post("/twilio/webhook-json", json={"text": ""}).status_code == 422
    assert client.post("/twilio/webhook-json", json={"text": "x" * 1001}).status_code == 422
    assert client.post("/twilio/webhook-json", json={"text": "cough", "locale": "english"}).status_code == 422
    assert client.post("/twilio/webhook-json", json={"text": "cough", "sender": "call me"}).status_code == 422


def test_sms_webhook_returns_twiml(client):
    r = client.post("/twilio/webhook", data={"Body": "heavy bleeding", "From": "+15551234567"})
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/xml")
    assert r.text.startswith('<?xml version="1.0" encoding="UTF-8"?><Response><Message>This could be serious.')
    assert client.get("/encounters").json()[0]["sender"] == "+15551234567"


def test_sms_webhook_empty_body_asks_for_symptoms(client):
    r = client.post("/twilio/webhook", data={"Body": "  "})
    assert "describe your symptoms" in r.text
    assert client.get("/encounters").json() == []  # nothing saved


def test_follow_up_text_is_triaged_with_conversation_context(client):
    phone = "+15550001111"
    first = client.post("/twilio/webhook-json", json={"text": "my baby has vomiting", "sender": phone}).json()
    assert first["triage"] == "ROUTINE" and first["thread_id"] is None
    second = client.post("/twilio/webhook-json", json={"text": "and diarrhea too", "sender": phone}).json()
    assert second["thread_id"] == first["id"]
    assert second["triage"] == "URGENT"  # baby + vomiting + diarrhea across both texts
    assert second["reason"] == "Urgent sign: vomiting + diarrhea + infant"
    # another number starts its own conversation
    other = client.post("/twilio/webhook-json", json={"text": "diarrhea", "sender": "+15559990000"}).json()
    assert other["thread_id"] is None and other["triage"] == "ROUTINE"


def test_phone_formats_join_the_same_thread(client):
    first = client.post("/twilio/webhook", data={"Body": "my baby is vomiting", "From": "+15550003333"})
    assert first.status_code == 200
    # curl -d turns "+" into a space; people also type dashes and parentheses
    client.post("/twilio/webhook", data={"Body": "and diarrhea", "From": " 15550003333"})
    second = client.post("/twilio/webhook-json", json={"text": "still sick", "sender": "(555) 000-3333"}).json()
    rows = client.get("/encounters?sender=555-000-3333").json()
    assert {r["sender"] for r in rows} == {"+15550003333"} and len(rows) == 3
    assert second["thread_id"] == rows[-1]["id"] and second["triage"] == "URGENT"


def test_resolved_case_starts_a_new_thread(client):
    phone = "+15550002222"
    first = client.post("/twilio/webhook-json", json={"text": "cough", "sender": phone}).json()
    client.patch(f"/encounters/{first['id']}", json={"status": "resolved"})
    again = client.post("/twilio/webhook-json", json={"text": "cough again", "sender": phone}).json()
    assert again["thread_id"] is None


def test_encounters_are_saved_newest_first_and_filterable(client):
    client.post("/twilio/webhook-json", json={"text": "mild cough"})
    client.post("/twilio/webhook", data={"Body": "loss of consciousness"})
    rows = client.get("/encounters").json()
    assert [r["channel"] for r in rows] == ["sms", "json"]
    assert rows[0]["triage"] == "EMERGENCY" and rows[0]["risk_score"] is None
    assert rows[1]["triage"] == "ROUTINE" and rows[1]["signals"] == ["cough"]
    assert client.get(f"/encounters/{rows[1]['id']}").json()["text"] == "mild cough"
    assert rows[0]["created_at"].endswith("+00:00")  # timezone kept so browsers show local time
    client.patch(f"/encounters/{rows[0]['id']}", json={"status": "acknowledged"})
    assert [r["id"] for r in client.get("/encounters?status=open").json()] == [rows[1]["id"]]


def test_status_update_and_stats(client):
    e = client.post("/twilio/webhook-json", json={"text": "seizure"}).json()
    client.post("/twilio/webhook-json", json={"text": "cough"})
    s = client.get("/stats").json()
    assert s == {"total": 2, "by_triage": {"EMERGENCY": 1, "URGENT": 0, "ROUTINE": 1}, "open_emergencies": 1}
    r = client.patch(f"/encounters/{e['id']}", json={"status": "acknowledged"})
    assert r.json()["status"] == "acknowledged"
    assert client.get("/stats").json()["open_emergencies"] == 0
    assert client.patch(f"/encounters/{e['id']}", json={"status": "done"}).status_code == 422
    assert client.patch("/encounters/999", json={"status": "resolved"}).status_code == 404


def test_explain_previews_without_saving(client):
    r = client.post("/triage/explain", json={"text": "no fever but I fainted"}).json()
    assert r["triage"] == "EMERGENCY"
    assert r["negated"] == ["fever"]
    assert client.get("/encounters").json() == []


def test_encounter_not_found(client):
    assert client.get("/encounters/999").status_code == 404


def test_websocket_pushes_new_and_updated_encounters(client):
    with client.websocket_connect("/ws/encounters") as ws:
        created = client.post("/twilio/webhook-json", json={"text": "my infant has a high fever"}).json()
        msg = ws.receive_json()
        assert msg["type"] == "encounter"
        assert msg["data"]["triage"] == "URGENT" and msg["data"]["text"] == "my infant has a high fever"
        client.patch(f"/encounters/{created['id']}", json={"status": "resolved"})
        upd = ws.receive_json()
    assert upd == {"type": "update", "data": {**created, "status": "resolved"}}
