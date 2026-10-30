from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db.models import Encounter, get_db
from backend.realtime import manager

router = APIRouter(tags=["encounters"])


@router.get("/encounters")
def list_encounters(limit: int = Query(default=50, ge=1, le=200), db: Session = Depends(get_db)):
    rows = db.scalars(select(Encounter).order_by(Encounter.id.desc()).limit(limit)).all()
    return [r.to_dict() for r in rows]


@router.get("/encounters/{encounter_id}")
def get_encounter(encounter_id: int, db: Session = Depends(get_db)):
    enc = db.get(Encounter, encounter_id)
    if enc is None:
        raise HTTPException(status_code=404, detail="Encounter not found")
    return enc.to_dict()


@router.websocket("/ws/encounters")
async def encounters_feed(ws: WebSocket):
    """Live feed for the dashboard: every new encounter is pushed as {"type": "encounter", "data": {...}}."""
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()  # keep the socket open; clients may send pings
    except WebSocketDisconnect:
        manager.disconnect(ws)
