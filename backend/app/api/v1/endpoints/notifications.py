from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Notification, NotificationLog, User
from app.schemas.schemas import (
    NotificationResponse, TestSMSResponse, SMSRetryResponse, NotificationLogResponse
)
from app.services.sms_service import send_sms_notification, mask_phone_number

router = APIRouter()

@router.get("/my-notifications", response_model=List[NotificationResponse])
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()
    return notifications

@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification

@router.post("/test-sms", response_model=TestSMSResponse)
def test_sms_delivery(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Development/Verification endpoint to send a REAL Twilio SMS
    strictly to the logged-in farmer's registered phone number.
    """
    if not current_user.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authenticated user does not have a registered mobile phone number."
        )

    res = send_sms_notification(
        db=db,
        user_id=current_user.id,
        recipient_phone=current_user.phone,
        event_type="TEST_SMS",
        language=current_user.preferred_language or "en",
        context={"phone": mask_phone_number(current_user.phone)},
        title="AgriFlow SMS Test"
    )

    return TestSMSResponse(
        success=res["success"],
        message_sid=res["message_sid"],
        status=res["status"],
        recipient_phone_masked=res["recipient_phone_masked"],
        rendered_message=res["rendered_message"],
        error_code=res.get("error_code"),
        error=res.get("error")
    )

@router.post("/{notification_id}/retry", response_model=SMSRetryResponse)
def retry_sms_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retry mechanism for failed SMS notifications using the farmer's registered mobile number.
    Does NOT recreate payments or bookings; only retries SMS dispatch.
    """
    notification = db.query(Notification).filter(
        Notification.id == notification_id
    ).first()

    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification record not found")

    # Authorize: Only the notification owner or an admin can trigger retry
    if notification.user_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to retry this notification")

    user = db.query(User).filter(User.id == notification.user_id).first()
    if not user or not user.phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recipient user phone number missing")

    res = send_sms_notification(
        db=db,
        user_id=user.id,
        recipient_phone=user.phone,
        event_type=notification.event_type,
        language=notification.language or "en",
        context={"phone": mask_phone_number(user.phone)},
        title=f"Retry: {notification.title}"
    )

    return SMSRetryResponse(
        success=res["success"],
        notification_id=notification.id,
        message_sid=res["message_sid"],
        status=res["status"],
        recipient_phone_masked=res["recipient_phone_masked"],
        error_code=res.get("error_code"),
        error=res.get("error")
    )

@router.post("/twilio-status")
async def twilio_status_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Twilio Webhook Callback endpoint to update real-time delivery statuses
    (QUEUED -> SENT -> DELIVERED / UNDELIVERED / FAILED).
    """
    form_data = await request.form()
    message_sid = form_data.get("MessageSid")
    message_status = form_data.get("MessageStatus")
    error_code = form_data.get("ErrorCode")
    error_message = form_data.get("ErrorMessage")

    if not message_sid:
        return {"status": "ignored", "reason": "Missing MessageSid"}

    status_upper = (message_status or "UNKNOWN").upper()

    log_entry = db.query(NotificationLog).filter(
        NotificationLog.provider_message_id == message_sid
    ).first()

    if log_entry:
        log_entry.delivery_status = status_upper
        if error_code:
            log_entry.error_code = str(error_code)
        if error_message:
            log_entry.error_message = str(error_message)
        db.commit()
        print(f"[TWILIO WEBHOOK UPDATED] MessageSid: {message_sid} -> Status: {status_upper}")

    return {"status": "processed", "message_sid": message_sid, "delivery_status": status_upper}
