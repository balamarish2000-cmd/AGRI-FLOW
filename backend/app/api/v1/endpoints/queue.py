import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, allow_officer
from app.models.models import QueueToken, ProcurementCentre, User, ProcurementOfficer
from app.schemas.schemas import QueueTokenResponse, QueueStateTransitionRequest
from app.services.queue_service import transition_queue_state, calculate_waiting_metrics
from app.services.realtime_service import manager

router = APIRouter()

@router.get("/live/{centre_id}", response_model=List[QueueTokenResponse])
def get_live_queue(
    centre_id: str,
    token_date: Optional[datetime.date] = Query(None),
    db: Session = Depends(get_db)
):
    target_date = token_date or datetime.date.today()
    tokens = db.query(QueueToken).filter(
        QueueToken.centre_id == centre_id,
        QueueToken.token_date == target_date
    ).order_by(QueueToken.position.asc()).all()

    res = []
    for qt in tokens:
        farmers_ahead, est_wait, rec_dep, dont_come = calculate_waiting_metrics(db, qt)
        res.append(QueueTokenResponse(
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
        ))
    return res

@router.post("/transition", response_model=QueueTokenResponse)
async def change_queue_state(
    req: QueueStateTransitionRequest,
    db: Session = Depends(get_db),
    officer_user: User = Depends(allow_officer)
):
    updated_token = transition_queue_state(db, officer_user.id, req)
    
    # Broadcast realtime update over WebSocket
    await manager.broadcast_queue_update(
        centre_id=updated_token.centre_id,
        data={
            "type": "QUEUE_UPDATE",
            "token_id": updated_token.id,
            "token_number": updated_token.token_number,
            "new_state": updated_token.state,
            "counter_assigned": updated_token.counter_assigned
        }
    )

    return updated_token
