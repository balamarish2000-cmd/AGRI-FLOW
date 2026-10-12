from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, allow_admin
from app.models.models import ProcurementCentre, User
from app.schemas.schemas import ProcurementCentreCreate, ProcurementCentreResponse

router = APIRouter()

@router.get("/", response_model=List[ProcurementCentreResponse])
def get_centres(db: Session = Depends(get_db)):
    centres = db.query(ProcurementCentre).filter(ProcurementCentre.is_active == True).all()
    return centres

@router.get("/{centre_id}", response_model=ProcurementCentreResponse)
def get_centre_by_id(centre_id: str, db: Session = Depends(get_db)):
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procurement centre not found")
    return centre

@router.post("/", response_model=ProcurementCentreResponse, status_code=status.HTTP_201_CREATED)
def create_centre(
    data: ProcurementCentreCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(allow_admin)
):
    existing = db.query(ProcurementCentre).filter(ProcurementCentre.code == data.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Centre code already exists")
    
    centre = ProcurementCentre(**data.model_dump())
    db.add(centre)
    db.commit()
    db.refresh(centre)
    return centre
