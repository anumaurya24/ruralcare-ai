import os
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from sqlalchemy.pool import StaticPool

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ruralcare.db")


def _make_engine(url: str):
    if url.startswith("sqlite"):
        kwargs = {"connect_args": {"check_same_thread": False}}
        if url in ("sqlite://", "sqlite:///:memory:"):
            kwargs["poolclass"] = StaticPool  # one shared in-memory DB (tests)
        return create_engine(url, **kwargs)
    return create_engine(url)


engine = _make_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Encounter(Base):
    """One inbound message and the triage decision made for it."""

    __tablename__ = "encounters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    channel: Mapped[str] = mapped_column(String(16))          # "json" or "sms"
    text: Mapped[str] = mapped_column(Text)
    locale: Mapped[str] = mapped_column(String(8), default="en")
    rule: Mapped[str] = mapped_column(String(16))             # EMERGENCY / URGENT / ROUTINE from rules.yaml
    risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    triage: Mapped[str] = mapped_column(String(16))           # final decision
    guidance: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                 default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        created = self.created_at
        if created.tzinfo is None:  # SQLite drops the offset; values are stored in UTC
            created = created.replace(tzinfo=timezone.utc)
        return {
            "id": self.id,
            "channel": self.channel,
            "text": self.text,
            "locale": self.locale,
            "rule": self.rule,
            "risk_score": self.risk_score,
            "triage": self.triage,
            "guidance": self.guidance,
            "created_at": created.isoformat(),
        }


def init_db() -> None:
    Base.metadata.create_all(engine)


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
