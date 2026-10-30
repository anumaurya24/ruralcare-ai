import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db.models import init_db
from backend.routers.encounters import router as encounters_router
from backend.routers.health import router as health_router
from backend.routers.twilio import router as twilio_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="RuralCare AI", version="0.2.0", lifespan=lifespan)

# Dashboard origins (comma-separated); defaults to the Vite dev server
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Endpoints: /healthz, /twilio/..., /encounters, /ws/encounters
app.include_router(health_router)
app.include_router(twilio_router)
app.include_router(encounters_router)


@app.get("/")
def root():
    return {"message": "RuralCare AI backend running", "docs": "/docs"}
