import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, allow_farmer, allow_officer
from app.models.models import Payment, FarmerProfile, User, AuditLog
from app.schemas.schemas import (
    PaymentResponse, PaymentStatusUpdateRequest,
    VerifyPaymentRequest, PaymentVerificationResponse
)
from app.services.payment_service import verify_razorpay_payment_service

router = APIRouter()

@router.post("/verify", response_model=PaymentVerificationResponse)
def verify_payment(
    data: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_farmer)
):
    return verify_razorpay_payment_service(
        db=db,
        farmer_user_id=current_user.id,
        razorpay_order_id=data.razorpay_order_id,
        razorpay_payment_id=data.razorpay_payment_id,
        razorpay_signature=data.razorpay_signature,
        centre_id=data.centre_id,
        slot_id=data.slot_id,
        crop_id=data.crop_id,
        expected_quantity_kg=data.expected_quantity_kg
    )

@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    # Idempotent Webhook Processing
    print(f"[RAZORPAY WEBHOOK] Received webhook notification. Signature: {signature[:10]}...")
    return {"status": "ok"}

@router.get("/my-payments", response_model=List[PaymentResponse])
def get_my_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_farmer)
):
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not farmer:
        return []

    payments = db.query(Payment).filter(Payment.farmer_id == farmer.id).order_by(Payment.created_at.desc()).all()

    res = []
    for p in payments:
        res.append(PaymentResponse(
            id=p.id,
            payment_ref=p.payment_ref,
            procurement_id=p.procurement_id or "",
            farmer_id=p.farmer_id,
            amount_inr=float(p.amount_inr),
            payment_status=p.payment_status,
            bank_ref_number=p.razorpay_payment_id or p.bank_ref_number,
            failure_reason=p.failure_reason,
            processed_at=p.processed_at,
            created_at=p.created_at
        ))
    return res

@router.patch("/{payment_id}/status", response_model=PaymentResponse)
def update_payment_status(
    payment_id: str,
    data: PaymentStatusUpdateRequest,
    db: Session = Depends(get_db),
    officer_user: User = Depends(allow_officer)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment record not found.")

    payment.payment_status = data.payment_status
    if data.bank_ref_number:
        payment.bank_ref_number = data.bank_ref_number
    if data.failure_reason:
        payment.failure_reason = data.failure_reason

    if data.payment_status in ["SUCCESS", "COMPLETED", "FAILED"]:
        payment.processed_at = datetime.datetime.utcnow()

    db.add(AuditLog(
        user_id=officer_user.id,
        action="PAYMENT_STATUS_UPDATE",
        entity_type="Payment",
        entity_id=payment.id,
        details=f"Payment {payment.payment_ref} status updated to {data.payment_status}"
    ))

    db.commit()
    db.refresh(payment)

    return PaymentResponse(
        id=payment.id,
        payment_ref=payment.payment_ref,
        procurement_id=payment.procurement_id or "",
        farmer_id=payment.farmer_id,
        amount_inr=float(payment.amount_inr),
        payment_status=payment.payment_status,
        bank_ref_number=payment.razorpay_payment_id or payment.bank_ref_number,
        failure_reason=payment.failure_reason,
        processed_at=payment.processed_at,
        created_at=payment.created_at
    )
