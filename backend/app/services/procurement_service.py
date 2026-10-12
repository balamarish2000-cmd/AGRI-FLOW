import random
import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.models import QueueToken, Booking, Procurement, Payment, AuditLog
from app.schemas.schemas import ProcurementCreate, ProcurementResponse
from app.services.sms_service import send_sms_notification

def complete_procurement_workflow(
    db: Session,
    officer_user_id: str,
    req: ProcurementCreate
) -> ProcurementResponse:
    # 1. Fetch Token
    token = db.query(QueueToken).filter(QueueToken.id == req.token_id).first()
    if not token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue token not found.")

    if token.state != "PROCESSING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Procurement can only be completed for tokens in PROCESSING state."
        )

    # 2. Fetch Booking & Farmer Profile
    booking = db.query(Booking).filter(Booking.id == token.booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated booking not found.")

    farmer_profile = booking.farmer
    if not farmer_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found.")

    # 3. Calculate total amount
    total_amount = req.actual_quantity_kg * req.unit_price_inr

    # 4. Generate Receipt Code
    receipt_code = f"RCP-{datetime.date.today().strftime('%Y%m%d')}-{random.randint(10000, 99999)}"

    procurement = Procurement(
        receipt_code=receipt_code,
        token_id=token.id,
        booking_id=booking.id,
        officer_id=officer_user_id,
        actual_quantity_kg=req.actual_quantity_kg,
        quality_grade=req.quality_grade,
        moisture_content_pct=req.moisture_content_pct,
        unit_price_inr=req.unit_price_inr,
        total_amount_inr=total_amount,
        status="COMPLETED",
        remarks=req.remarks,
        completed_at=datetime.datetime.utcnow()
    )
    db.add(procurement)
    db.flush()

    # 5. Transition token & booking state to COMPLETED
    now = datetime.datetime.utcnow()
    token.state = "COMPLETED"
    token.completed_time = now
    booking.status = "COMPLETED"

    # 6. Initialize Payment Record (Status Tracking)
    payment_ref = f"PAY-{datetime.date.today().strftime('%Y%m%d')}-{random.randint(100000, 999999)}"
    payment = Payment(
        payment_ref=payment_ref,
        procurement_id=procurement.id,
        farmer_id=farmer_profile.id,
        amount_inr=total_amount,
        payment_status="PROCESSING",  # Initial status set to PROCESSING
        created_at=now
    )
    db.add(payment)

    # Audit log
    db.add(AuditLog(
        user_id=officer_user_id,
        action="PROCUREMENT_COMPLETED",
        entity_type="Procurement",
        entity_id=procurement.id,
        details=f"Receipt {receipt_code}: {req.actual_quantity_kg} kg @ INR {req.unit_price_inr}/kg. Total: INR {total_amount}"
    ))

    db.commit()
    db.refresh(procurement)

    # Trigger Procurement Completed SMS
    if farmer_profile.user:
        send_sms_notification(
            db=db,
            user_id=farmer_profile.user.id,
            recipient_phone=farmer_profile.user.phone,
            event_type="PROCUREMENT_COMPLETED",
            language=farmer_profile.user.preferred_language or "en",
            context={
                "receipt_code": receipt_code,
                "quantity": req.actual_quantity_kg,
                "grade": req.quality_grade,
                "amount": f"{total_amount:,.2f}"
            },
            title="Procurement Completed"
        )

    return ProcurementResponse(
        id=procurement.id,
        receipt_code=procurement.receipt_code,
        token_id=procurement.token_id,
        booking_id=procurement.booking_id,
        officer_id=procurement.officer_id,
        actual_quantity_kg=float(procurement.actual_quantity_kg),
        quality_grade=procurement.quality_grade,
        moisture_content_pct=float(procurement.moisture_content_pct),
        unit_price_inr=float(procurement.unit_price_inr),
        total_amount_inr=float(procurement.total_amount_inr),
        status=procurement.status,
        remarks=procurement.remarks,
        completed_at=procurement.completed_at
    )
