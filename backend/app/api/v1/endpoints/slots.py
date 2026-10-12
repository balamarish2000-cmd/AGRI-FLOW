import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, allow_admin
from app.models.models import Slot, User
from app.schemas.schemas import SlotCreate, SlotResponse

router = APIRouter()

@router.get("/", response_model=List[SlotResponse])
def get_slots(
    centre_id: str,
    slot_date: Optional[datetime.date] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Slot).filter(Slot.centre_id == centre_id, Slot.is_available == True)
    if slot_date:
        query = query.filter(Slot.slot_date == slot_date)
    else:
        query = query.filter(Slot.slot_date >= datetime.date.today())
    
    slots = query.order_by(Slot.slot_date, Slot.start_time).all()
    
    # Format time objects to string for Pydantic
    res = []
    for s in slots:
        res.append(SlotResponse(
            id=s.id,
            centre_id=s.centre_id,
            slot_date=s.slot_date,
            start_time=s.start_time.strftime("%H:%M:%S") if isinstance(s.start_time, datetime.time) else str(s.start_time),
            end_time=s.end_time.strftime("%H:%M:%S") if isinstance(s.end_time, datetime.time) else str(s.end_time),
            max_capacity_kg=float(s.max_capacity_kg),
            booked_capacity_kg=float(s.booked_capacity_kg),
            max_farmers=s.max_farmers,
            booked_farmers=s.booked_farmers,
            is_available=s.is_available
        ))
    return res

@router.post("/", response_model=SlotResponse, status_code=status.HTTP_201_CREATED)
def create_slot(
    data: SlotCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(allow_admin)
):
    start_t = datetime.datetime.strptime(data.start_time, "%H:%M:%S").time() if len(data.start_time) == 8 else datetime.datetime.strptime(data.start_time, "%H:%M").time()
    end_t = datetime.datetime.strptime(data.end_time, "%H:%M:%S").time() if len(data.end_time) == 8 else datetime.datetime.strptime(data.end_time, "%H:%M").time()

    slot = Slot(
        centre_id=data.centre_id,
        slot_date=data.slot_date,
        start_time=start_t,
        end_time=end_t,
        max_capacity_kg=data.max_capacity_kg,
        max_farmers=data.max_farmers,
        is_available=True
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)

    return SlotResponse(
        id=slot.id,
        centre_id=slot.centre_id,
        slot_date=slot.slot_date,
        start_time=slot.start_time.strftime("%H:%M:%S"),
        end_time=slot.end_time.strftime("%H:%M:%S"),
        max_capacity_kg=float(slot.max_capacity_kg),
        booked_capacity_kg=float(slot.booked_capacity_kg),
        max_farmers=slot.max_farmers,
        booked_farmers=slot.booked_farmers,
        is_available=slot.is_available
    )
