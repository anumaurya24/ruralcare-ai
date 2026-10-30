def test_healthz(client):
    assert client.get("/healthz").json() == {"status": "ok"}


def test_json_webhook_emergency(client):
    r = client.post("/twilio/webhook-json", json={"text": "chest pain and shortness of breath"})
    assert r.status_code == 200
    body = r.json()
    assert body["triage"] == "EMERGENCY"
    assert "seek care immediately" in body["guidance"]


def test_json_webhook_score_escalates_to_urgent(client):
    # no rule fires, but fever + breath pushes the risk score past 0.6
    r = client.post("/twilio/webhook-json", json={"text": "fever and trouble catching my breath"})
    assert r.json()["triage"] == "URGENT"


def test_json_webhook_validation(client):
    assert client.post("/twilio/webhook-json", json={"text": ""}).status_code == 422
    assert client.post("/twilio/webhook-json", json={"text": "x" * 1001}).status_code == 422
    assert client.post("/twilio/webhook-json", json={"text": "cough", "locale": "english"}).status_code == 422


def test_sms_webhook_returns_twiml(client):
    r = client.post("/twilio/webhook", data={"Body": "heavy bleeding"})
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/xml")
    assert r.text.startswith('<?xml version="1.0" encoding="UTF-8"?><Response><Message>This could be serious.')


def test_sms_webhook_empty_body_asks_for_symptoms(client):
    r = client.post("/twilio/webhook", data={"Body": "  "})
    assert "describe your symptoms" in r.text
    assert client.get("/encounters").json() == []  # nothing saved


def test_encounters_are_saved_newest_first(client):
    client.post("/twilio/webhook-json", json={"text": "mild cough"})
    client.post("/twilio/webhook", data={"Body": "loss of consciousness"})
    rows = client.get("/encounters").json()
    assert [r["channel"] for r in rows] == ["sms", "json"]
    assert rows[0]["triage"] == "EMERGENCY" and rows[0]["risk_score"] is None
    assert rows[1]["triage"] == "ROUTINE" and rows[1]["risk_score"] is not None
    assert client.get(f"/encounters/{rows[1]['id']}").json()["text"] == "mild cough"
    assert rows[0]["created_at"].endswith("+00:00")  # timezone kept so browsers show local time


def test_encounter_not_found(client):
    assert client.get("/encounters/999").status_code == 404


def test_websocket_pushes_new_encounters(client):
    with client.websocket_connect("/ws/encounters") as ws:
        client.post("/twilio/webhook-json", json={"text": "my infant has a high fever"})
        msg = ws.receive_json()
    assert msg["type"] == "encounter"
    assert msg["data"]["triage"] == "URGENT"
    assert msg["data"]["text"] == "my infant has a high fever"
