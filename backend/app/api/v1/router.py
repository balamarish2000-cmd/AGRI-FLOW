from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, farmers, centres, slots, bookings, queue, procurements, payments, notifications, admin
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(farmers.router, prefix="/farmers", tags=["Farmers"])
api_router.include_router(centres.router, prefix="/centres", tags=["Centres"])
api_router.include_router(slots.router, prefix="/slots", tags=["Slots"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
api_router.include_router(queue.router, prefix="/queue", tags=["Queue"])
api_router.include_router(procurements.router, prefix="/procurements", tags=["Procurements"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
