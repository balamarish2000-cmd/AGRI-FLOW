import datetime
from typing import List, Tuple, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.models import QueueToken, Booking, ProcurementCentre, AuditLog
from app.schemas.schemas import QueueTokenResponse, QueueStateTransitionRequest
from app.services.sms_service import send_sms_notification

# Valid queue state transitions
VALID_TRANSITIONS = {
    "BOOKED": ["ARRIVED", "CANCELLED"],
    "ARRIVED": ["WAITING", "CALLED", "CANCELLED"],
    "WAITING": ["CALLED", "NO_SHOW", "CANCELLED"],
    "CALLED": ["PROCESSING", "NO_SHOW", "CANCELLED"],
    "PROCESSING": ["COMPLETED", "CANCELLED"],
    "COMPLETED": [],
    "NO_SHOW": ["WAITING", "CANCELLED"],
    "CANCELLED": []
}

def calculate_waiting_metrics(
    db: Session,
    queue_token: QueueToken,
    travel_time_mins: int = 30
) -> Tuple[int, int, Optional[str], bool]:
    """
    Returns: (farmers_ahead, estimated_wait_mins, recommended_departure_time_str, dont_come_yet_boolean)
    
    Formula:
    estimated_wait = (farmers_ahead * average_processing_time) / active_counters
    """
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == queue_token.centre_id).first()
    if not centre:
        return (0, 0, None, False)

    active_counters = max(centre.active_counters, 1)
    avg_processing_mins = centre.avg_processing_mins_per_farmer or 15

    # Count farmers ahead in WAITING or ARRIVED states with lower positions
    farmers_ahead = db.query(QueueToken).filter(
        QueueToken.centre_id == queue_token.centre_id,
        QueueToken.token_date == queue_token.token_date,
        QueueToken.state.in_(["ARRIVED", "WAITING", "CALLED"]),
        QueueToken.position < queue_token.position
    ).count()

    # Deterministic formula calculation
    estimated_wait_mins = int((farmers_ahead * avg_processing_mins) / active_counters)

    # "Don't Come Yet" Logic:
    # If estimated_wait_mins > (travel_time_mins + 15 mins buffer), farmer should wait at home
    dont_come_yet = False
    recommended_departure = None

    if estimated_wait_mins > (travel_time_mins + 15):
        dont_come_yet = True
        mins_until_departure = estimated_wait_mins - travel_time_mins - 10
        dep_time = datetime.datetime.now() + datetime.timedelta(minutes=mins_until_departure)
        recommended_departure = dep_time.strftime("%I:%M %p")

    return (farmers_ahead, estimated_wait_mins, recommended_departure, dont_come_yet)

def transition_queue_state(
    db: Session,
    officer_user_id: str,
    req: QueueStateTransitionRequest
) -> QueueTokenResponse:
    token = db.query(QueueToken).filter(QueueToken.id == req.token_id).with_for_update().first()
    if not token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue token not found.")

    current_state = token.state
    new_state = req.new_state.upper()

    # Validate transition
    allowed = VALID_TRANSITIONS.get(current_state, [])
    if new_state not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid queue state transition from {current_state} to {new_state}."
        )

    # Perform State Shift & Timestamp
    now = datetime.datetime.utcnow()
    token.state = new_state
    token.updated_at = now

    if new_state == "ARRIVED":
        token.arrival_time = now
    elif new_state == "CALLED":
        token.called_time = now
        if req.counter_number:
            token.counter_assigned = req.counter_number
    elif new_state == "PROCESSING":
        token.processing_start_time = now
    elif new_state == "COMPLETED":
        token.completed_time = now

    # Also update booking status
    booking = db.query(Booking).filter(Booking.id == token.booking_id).first()
    if booking:
        booking.status = new_state

    # Audit log
    db.add(AuditLog(
        user_id=officer_user_id,
        action="QUEUE_STATE_CHANGE",
        entity_type="QueueToken",
        entity_id=token.id,
        details=f"Token {token.token_number} transitioned from {current_state} -> {new_state}"
    ))

    db.commit()
    db.refresh(token)

    # Trigger SMS Notifications based on event
    if booking and booking.farmer and booking.farmer.user:
        farmer_user = booking.farmer.user
        lang = farmer_user.preferred_language or "en"
        phone = farmer_user.phone

        if new_state == "CALLED":
            send_sms_notification(
                db=db,
                user_id=farmer_user.id,
                recipient_phone=phone,
                event_type="TOKEN_CALLED",
                language=lang,
                context={
                    "token_number": token.token_number,
                    "counter": token.counter_assigned or 1
                },
                title="Token Called!"
            )
        elif new_state in ["ARRIVED", "WAITING"]:
            farmers_ahead, est_wait, _, _ = calculate_waiting_metrics(db, token)
            if farmers_ahead <= 5 and farmers_ahead > 0:
                send_sms_notification(
                    db=db,
                    user_id=farmer_user.id,
                    recipient_phone=phone,
                    event_type="QUEUE_APPROACHING",
                    language=lang,
                    context={
                        "token_number": token.token_number,
                        "farmers_ahead": farmers_ahead,
                        "est_wait": est_wait
                    },
                    title="Queue Approaching"
                )

    farmers_ahead, est_wait, rec_dep, dont_come = calculate_waiting_metrics(db, token)

    return QueueTokenResponse(
        id=token.id,
        token_number=token.token_number,
        booking_id=token.booking_id,
        centre_id=token.centre_id,
        token_date=token.token_date,
        position=token.position,
        state=token.state,
        counter_assigned=token.counter_assigned,
        arrival_time=token.arrival_time,
        called_time=token.called_time,
        processing_start_time=token.processing_start_time,
        completed_time=token.completed_time,
        estimated_wait_mins=est_wait,
        farmers_ahead=farmers_ahead,
        recommended_departure_time=rec_dep,
        dont_come_yet=dont_come
    )
