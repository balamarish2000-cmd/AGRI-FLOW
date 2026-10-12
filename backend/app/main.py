import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import init_db
from app.api.v1.router import api_router
from app.services.realtime_service import manager

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Smart Agricultural Procurement & Queue Management Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.services.sms_service import safe_print

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    safe_print(f"[ERROR] Global Exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

# Include API Router
app.include_router(api_router, prefix="/api/v1")

# WebSocket Endpoint for Realtime Queue Broadcasts
@app.websocket("/ws/queue/{centre_id}")
async def websocket_queue_endpoint(websocket: WebSocket, centre_id: str):
    await manager.connect(websocket, centre_id)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, centre_id)

@app.on_event("startup")
def on_startup():
    init_db()
    print("[AGRIFLOW] Backend initialized and ready.")

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "status": "online",
        "docs": "/docs"
    }
