from sqlalchemy.orm import Session

from backend.db.models import Encounter
from backend.llm.generator import generate_guidance
from backend.realtime import manager
from backend.triage.engine import apply_rules, decide, predict_risk


async def triage_message(db: Session, text: str, locale: str, channel: str) -> Encounter:
    """Triage one message, save it, and push it to live dashboards."""
    rule = apply_rules(text)
    score = None if rule in ("EMERGENCY", "URGENT") else predict_risk(text)
    triage = decide(rule, score)
    enc = Encounter(channel=channel, text=text, locale=locale, rule=rule, risk_score=score,
                    triage=triage, guidance=generate_guidance(triage=triage, text=text, locale=locale))
    db.add(enc)
    db.commit()
    db.refresh(enc)
    await manager.broadcast({"type": "encounter", "data": enc.to_dict()})
    return enc
