from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, allow_farmer
from app.models.models import Booking, FarmerProfile, User, QueueToken
from app.schemas.schemas import (
    BookingCreate, BookingResponse, QueueTokenResponse,
    CreateRazorpayOrderRequest, RazorpayOrderResponse
)
from app.services.slot_service import create_slot_booking
from app.services.payment_service import create_razorpay_order_service
from app.services.queue_service import calculate_waiting_metrics

router = APIRouter()

@router.post("/create-order", response_model=RazorpayOrderResponse, status_code=status.HTTP_201_CREATED)
def create_booking_order(
    data: CreateRazorpayOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_farmer)
):
    return create_razorpay_order_service(
        db=db,
        farmer_user_id=current_user.id,
        centre_id=data.centre_id,
        slot_id=data.slot_id,
        crop_id=data.crop_id,
        expected_quantity_kg=data.expected_quantity_kg
    )

@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def book_slot(
    data: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_farmer)
):
    return create_slot_booking(db, current_user.id, data)

@router.get("/my-bookings", response_model=List[BookingResponse])
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_farmer)
):
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not farmer:
        return []

    bookings = db.query(Booking).filter(Booking.farmer_id == farmer.id).order_by(Booking.created_at.desc()).all()

    res = []
    for b in bookings:
        token_resp = None
        if b.queue_token:
            qt = b.queue_token
            farmers_ahead, est_wait, rec_dep, dont_come = calculate_waiting_metrics(db, qt)
            token_resp = QueueTokenResponse(
                id=qt.id,
                token_number=qt.token_number,
                booking_id=qt.booking_id,
                centre_id=qt.centre_id,
                token_date=qt.token_date,
                position=qt.position,
                state=qt.state,
                counter_assigned=qt.counter_assigned,
                arrival_time=qt.arrival_time,
                called_time=qt.called_time,
                processing_start_time=qt.processing_start_time,
                completed_time=qt.completed_time,
                estimated_wait_mins=est_wait,
                farmers_ahead=farmers_ahead,
                recommended_departure_time=rec_dep,
                dont_come_yet=dont_come
            )
        res.append(BookingResponse(
            id=b.id,
            booking_code=b.booking_code,
            farmer_id=b.farmer_id,
            slot_id=b.slot_id,
            crop_id=b.crop_id,
            expected_quantity_kg=float(b.expected_quantity_kg),
            status=b.status,
            queue_token=token_resp,
            created_at=b.created_at
        ))
    return res
