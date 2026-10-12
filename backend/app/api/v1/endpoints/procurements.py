from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, allow_officer, allow_farmer
from app.models.models import Procurement, FarmerProfile, Booking, User
from app.schemas.schemas import ProcurementCreate, ProcurementResponse
from app.services.procurement_service import complete_procurement_workflow

router = APIRouter()

@router.post("/", response_model=ProcurementResponse, status_code=status.HTTP_201_CREATED)
def create_procurement(
    data: ProcurementCreate,
    db: Session = Depends(get_db),
    officer_user: User = Depends(allow_officer)
):
    return complete_procurement_workflow(db, officer_user.id, data)

@router.get("/my-procurements", response_model=List[ProcurementResponse])
def get_my_procurements(
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_farmer)
):
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not farmer:
        return []

    procurements = db.query(Procurement).join(Booking).filter(Booking.farmer_id == farmer.id).order_by(Procurement.completed_at.desc()).all()

    res = []
    for p in procurements:
        res.append(ProcurementResponse(
            id=p.id,
            receipt_code=p.receipt_code,
            token_id=p.token_id,
            booking_id=p.booking_id,
            officer_id=p.officer_id,
            actual_quantity_kg=float(p.actual_quantity_kg),
            quality_grade=p.quality_grade,
            moisture_content_pct=float(p.moisture_content_pct),
            unit_price_inr=float(p.unit_price_inr),
            total_amount_inr=float(p.total_amount_inr),
            status=p.status,
            remarks=p.remarks,
            completed_at=p.completed_at
        ))
    return res
