import re
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db.models import Encounter
from backend.llm.generator import generate_guidance
from backend.realtime import manager
from backend.triage.engine import assess

THREAD_WINDOW = timedelta(hours=6)  # a follow-up text within this window continues the conversation


def normalize_phone(raw: str | None) -> str | None:
    """'+1 (555) 000-1111', ' 15550001111' and '5550001111' all become '+15550001111'."""
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 10:  # US number without country code
        digits = "1" + digits
    return f"+{digits}" if 7 <= len(digits) <= 15 else None


def _open_thread(db: Session, sender: str | None) -> Encounter | None:
    if not sender:
        return None
    last = db.scalars(select(Encounter).where(Encounter.sender == sender)
                      .order_by(Encounter.id.desc()).limit(1)).first()
    if last is None or last.status == "resolved":
        return None
    created = last.created_at if last.created_at.tzinfo else last.created_at.replace(tzinfo=timezone.utc)
    return last if datetime.now(timezone.utc) - created <= THREAD_WINDOW else None


async def triage_message(db: Session, text: str, locale: str, channel: str, sender: str | None = None) -> Encounter:
    """Triage one message (with earlier texts from the same sender as context), save it, push it live."""
    sender = normalize_phone(sender)
    prev = _open_thread(db, sender)
    thread_id = (prev.thread_id or prev.id) if prev else None
    context = text
    if thread_id:
        earlier = db.scalars(select(Encounter.text).where(
            (Encounter.thread_id == thread_id) | (Encounter.id == thread_id)).order_by(Encounter.id)).all()
        context = " . ".join([*earlier, text])
    a = assess(context)
    enc = Encounter(channel=channel, text=text, locale=locale, rule=a.rule, risk_score=a.risk_score,
                    triage=a.triage, reason=a.reason, signals=",".join(a.signals), duration_days=a.duration_days,
                    sender=sender, thread_id=thread_id,
                    guidance=generate_guidance(a.triage, context, locale, a.signals, a.duration_days is not None))
    db.add(enc)
    db.commit()
    db.refresh(enc)
    await manager.broadcast({"type": "encounter", "data": enc.to_dict()})
    return enc
