from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, allow_farmer
from app.models.models import FarmerProfile, Farm, Crop, User
from app.schemas.schemas import FarmerProfileResponse, FarmCreate, FarmResponse, CropCreate, CropResponse

router = APIRouter()

@router.get("/profile", response_model=FarmerProfileResponse)
def get_farmer_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_farmer)
):
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found")
    return profile

@router.post("/farms", response_model=FarmResponse, status_code=status.HTTP_201_CREATED)
def add_farm(
    data: FarmCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_farmer)
):
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found")

    farm = Farm(
        farmer_id=profile.id,
        farm_name=data.farm_name,
        location_address=data.location_address,
        district=data.district,
        land_area_acres=data.land_area_acres
    )
    db.add(farm)
    db.flush()

    for c in data.crops:
        crop = Crop(
            farm_id=farm.id,
            crop_name=c.crop_name,
            variety=c.variety,
            expected_quantity_kg=c.expected_quantity_kg,
            harvest_period=c.harvest_period
        )
        db.add(crop)

    db.commit()
    db.refresh(farm)
    return farm

@router.get("/crops", response_model=List[CropResponse])
def get_my_crops(
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_farmer)
):
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not profile:
        return []

    crops = db.query(Crop).join(Farm).filter(Farm.farmer_id == profile.id).all()
    return crops
