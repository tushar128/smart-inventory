from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine
from .routers import auth, items

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Inventory API",
    description="Inventory management REST API with JWT authentication.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(items.router, prefix="/api")


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
