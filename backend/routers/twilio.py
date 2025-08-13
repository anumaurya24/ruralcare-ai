from fastapi import APIRouter, Request
from pydantic import BaseModel
from backend.triage.engine import apply_rules, predict_risk, decide
from backend.llm.generator import generate_guidance

router = APIRouter(prefix="/twilio", tags=["channels"])

class InboundMessage(BaseModel):
    text: str
    locale: str = "en"

@router.post("/webhook-json")
async def inbound_json(msg: InboundMessage):
    rule = apply_rules(msg.text)
    score = None if rule in ["EMERGENCY", "URGENT"] else predict_risk(msg.text)
    triage = decide(rule, score)
    guidance = generate_guidance(triage=triage, text=msg.text, locale=msg.locale)
    return {"triage": triage, "guidance": guidance}

# Optional (for real Twilio form posts later)
@router.post("/webhook")
async def inbound_form(req: Request):
    form = await req.form()
    text = form.get("Body", "")
    rule = apply_rules(text)
    score = None if rule in ["EMERGENCY", "URGENT"] else predict_risk(text)
    triage = decide(rule, score)
    guidance = generate_guidance(triage=triage, text=text, locale="en")
    return {"triage": triage, "guidance": guidance}
