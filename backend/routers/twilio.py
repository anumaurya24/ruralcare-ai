from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, Form, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.db.models import get_db
from backend.service import triage_message

router = APIRouter(prefix="/twilio", tags=["channels"])


class InboundMessage(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    locale: str = Field(default="en", pattern=r"^[a-z]{2}(-[A-Z]{2})?$")


@router.post("/webhook-json")
async def inbound_json(msg: InboundMessage, db: Session = Depends(get_db)):
    enc = await triage_message(db, msg.text.strip(), msg.locale, channel="json")
    return {"id": enc.id, "triage": enc.triage, "guidance": enc.guidance}


@router.post("/webhook")
async def inbound_sms(Body: str = Form(default=""), db: Session = Depends(get_db)):
    """Twilio posts inbound SMS as a form; reply with TwiML so Twilio texts the guidance back."""
    text = Body.strip()[:1000]
    if not text:
        reply = "Please describe your symptoms in a short message."
    else:
        reply = (await triage_message(db, text, "en", channel="sms")).guidance
    twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{escape(reply)}</Message></Response>'
    return Response(content=twiml, media_type="application/xml")
