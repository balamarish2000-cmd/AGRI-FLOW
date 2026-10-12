import random
import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.models import Slot, Booking, QueueToken, FarmerProfile, ProcurementCentre, Crop, AuditLog
from app.schemas.schemas import BookingCreate, BookingResponse, QueueTokenResponse
from app.services.sms_service import send_sms_notification

def create_slot_booking(db: Session, farmer_user_id: str, req: BookingCreate) -> BookingResponse:
    # 1. Fetch Farmer Profile
    farmer_profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == farmer_user_id).first()
    if not farmer_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found.")

    # 2. Check Crop Ownership
    crop = db.query(Crop).filter(Crop.id == req.crop_id).first()
    if not crop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crop not found.")

    # 3. Fetch Slot with Lock
    slot = db.query(Slot).filter(Slot.id == req.slot_id).with_for_update().first()
    if not slot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procurement slot not found.")

    if not slot.is_available:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected slot is no longer available.")

    # Check Date expiration
    if slot.slot_date < datetime.date.today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot book an expired slot.")

    # Check capacity limits
    if slot.booked_farmers >= slot.max_farmers:
        slot.is_available = False
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No slots are currently available. Maximum farmer capacity reached.")

    if (float(slot.booked_capacity_kg) + req.expected_quantity_kg) > float(slot.max_capacity_kg):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Slot capacity exceeded. Available capacity: {float(slot.max_capacity_kg) - float(slot.booked_capacity_kg)} kg."
        )

    # 4. Check Duplicate Booking (Same farmer, same date, same crop)
    existing = db.query(Booking).join(Slot).filter(
        Booking.farmer_id == farmer_profile.id,
        Booking.crop_id == req.crop_id,
        Slot.slot_date == slot.slot_date,
        Booking.status.in_(["BOOKED", "ARRIVED", "WAITING", "CALLED", "PROCESSING"])
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active booking for this crop on the selected date."
        )

    # 5. Create Booking
    booking_code = f"BK-{datetime.date.today().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
    booking = Booking(
        booking_code=booking_code,
        farmer_id=farmer_profile.id,
        slot_id=slot.id,
        crop_id=req.crop_id,
        expected_quantity_kg=req.expected_quantity_kg,
        status="BOOKED"
    )
    db.add(booking)
    db.flush()

    # Update slot counters
    slot.booked_farmers += 1
    slot.booked_capacity_kg = float(slot.booked_capacity_kg) + req.expected_quantity_kg
    if slot.booked_farmers >= slot.max_farmers:
        slot.is_available = False

    # 6. Generate Queue Token
    # Count current tokens for center on slot_date
    today_tokens_count = db.query(QueueToken).filter(
        QueueToken.centre_id == slot.centre_id,
        QueueToken.token_date == slot.slot_date
    ).count()

    position = today_tokens_count + 1
    token_letter = chr(65 + (position // 100))  # A, B, C...
    token_number = f"{token_letter}{position:02d}"

    queue_token = QueueToken(
        token_number=token_number,
        booking_id=booking.id,
        centre_id=slot.centre_id,
        token_date=slot.slot_date,
        position=position,
        state="BOOKED"
    )
    db.add(queue_token)
    db.flush()

    # Audit log
    db.add(AuditLog(
        user_id=farmer_user_id,
        action="SLOT_BOOKED",
        entity_type="Booking",
        entity_id=booking.id,
        details=f"Slot booked at centre {slot.centre_id}. Token: {token_number}"
    ))

    db.commit()
    db.refresh(booking)

    # Trigger SMS notification
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == slot.centre_id).first()
    send_sms_notification(
        db=db,
        user_id=farmer_user_id,
        recipient_phone=farmer_profile.user.phone,
        event_type="SLOT_BOOKED",
        language=farmer_profile.user.preferred_language or "en",
        context={
            "date": slot.slot_date.strftime("%Y-%m-%d"),
            "centre": centre.name if centre else "Procurement Hub",
            "token_number": token_number,
            "position": position
        },
        title="Slot Booking Confirmed"
    )

    token_resp = QueueTokenResponse(
        id=queue_token.id,
        token_number=queue_token.token_number,
        booking_id=queue_token.booking_id,
        centre_id=queue_token.centre_id,
        token_date=queue_token.token_date,
        position=queue_token.position,
        state=queue_token.state
    )

    return BookingResponse(
        id=booking.id,
        booking_code=booking.booking_code,
        farmer_id=booking.farmer_id,
        slot_id=booking.slot_id,
        crop_id=booking.crop_id,
        expected_quantity_kg=float(booking.expected_quantity_kg),
        status=booking.status,
        queue_token=token_resp,
        created_at=booking.created_at
    )
