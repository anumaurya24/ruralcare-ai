from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# absolute imports from the backend package
from backend.routers.health import router as health_router
from backend.routers.twilio import router as twilio_router

app = FastAPI(title="RuralCare AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes (no prefix here; endpoints will be /healthz and /twilio/...)
app.include_router(health_router)
app.include_router(twilio_router)

@app.get("/")
def root():
    return {"message": "RuralCare AI backend running", "docs": "/docs"}
