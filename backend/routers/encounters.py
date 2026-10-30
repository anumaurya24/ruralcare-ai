from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.db.models import Encounter, get_db
from backend.realtime import manager
from backend.service import normalize_phone
from backend.triage.engine import assess

router = APIRouter(tags=["encounters"])

Status = Literal["open", "acknowledged", "resolved"]


class StatusUpdate(BaseModel):
    status: Status


class ExplainRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


@router.get("/encounters")
def list_encounters(limit: int = Query(default=50, ge=1, le=200), status: Status | None = None,
                    sender: str | None = None, db: Session = Depends(get_db)):
    q = select(Encounter).order_by(Encounter.id.desc()).limit(limit)
    if status:
        q = q.where(Encounter.status == status)
    if sender:
        q = q.where(Encounter.sender == normalize_phone(sender))
    return [r.to_dict() for r in db.scalars(q).all()]


@router.get("/encounters/{encounter_id}")
def get_encounter(encounter_id: int, db: Session = Depends(get_db)):
    enc = db.get(Encounter, encounter_id)
    if enc is None:
        raise HTTPException(status_code=404, detail="Encounter not found")
    return enc.to_dict()


@router.patch("/encounters/{encounter_id}")
async def update_status(encounter_id: int, body: StatusUpdate, db: Session = Depends(get_db)):
    """Staff acknowledge or resolve a case; every open dashboard sees the change."""
    enc = db.get(Encounter, encounter_id)
    if enc is None:
        raise HTTPException(status_code=404, detail="Encounter not found")
    enc.status = body.status
    db.commit()
    await manager.broadcast({"type": "update", "data": enc.to_dict()})
    return enc.to_dict()


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    by_triage = dict(db.execute(select(Encounter.triage, func.count()).group_by(Encounter.triage)).all())
    open_emergencies = db.scalar(select(func.count()).where(
        Encounter.triage == "EMERGENCY", Encounter.status == "open"))
    return {
        "total": sum(by_triage.values()),
        "by_triage": {k: by_triage.get(k, 0) for k in ("EMERGENCY", "URGENT", "ROUTINE")},
        "open_emergencies": open_emergencies,
    }


@router.post("/triage/explain")
def explain(body: ExplainRequest):
    """Preview a triage decision without saving it (used for the live preview while typing)."""
    return assess(body.text).to_dict()


@router.websocket("/ws/encounters")
async def encounters_feed(ws: WebSocket):
    """Live feed: {"type": "encounter" | "update", "data": {...}} for every new or changed case."""
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()  # keep the socket open; clients may send pings
    except WebSocketDisconnect:
        manager.disconnect(ws)
