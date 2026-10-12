import random
import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.models import User, FarmerProfile, Farm, Crop, SupportedLanguage, AuditLog
from app.schemas.schemas import LoginRequest, FarmerRegisterRequest, TokenResponse
from app.core.security import verify_password, get_password_hash, create_access_token

def authenticate_user(db: Session, credentials: LoginRequest) -> TokenResponse:
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support."
        )

    access_token = create_access_token(data={"sub": user.id, "role": user.role})

    # Log audit event
    audit = AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        entity_type="User",
        entity_id=user.id,
        details=f"User {user.email} logged in successfully with role {user.role}"
    )
    db.add(audit)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        preferred_language=user.preferred_language or "en"
    )

def register_farmer(db: Session, req: FarmerRegisterRequest) -> TokenResponse:
    # 1. Check existing user by email or phone
    existing_user = db.query(User).filter((User.email == req.email) | (User.phone == req.phone)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or phone number already exists."
        )

    # 2. Check language
    lang = db.query(SupportedLanguage).filter(SupportedLanguage.code == req.preferred_language).first()
    if not lang:
        req.preferred_language = "en"

    # 3. Create User record
    user = User(
        email=req.email,
        password_hash=get_password_hash(req.password),
        role="FARMER",
        full_name=req.full_name,
        phone=req.phone,
        preferred_language=req.preferred_language,
        is_active=True
    )
    db.add(user)
    db.flush()

    # 4. Create Farmer Profile
    farmer_code = f"FARM-2026-{random.randint(1000, 9999)}"
    farmer_profile = FarmerProfile(
        user_id=user.id,
        farmer_code=farmer_code,
        address=req.address,
        village=req.village,
        district=req.district,
        state=req.state,
        ifsc_code=req.ifsc_code
    )
    db.add(farmer_profile)
    db.flush()

    # 5. Create Farms & Crops
    for farm_data in req.farms:
        farm = Farm(
            farmer_id=farmer_profile.id,
            farm_name=farm_data.farm_name,
            location_address=farm_data.location_address,
            district=farm_data.district,
            land_area_acres=farm_data.land_area_acres
        )
        db.add(farm)
        db.flush()

        for crop_data in farm_data.crops:
            crop = Crop(
                farm_id=farm.id,
                crop_name=crop_data.crop_name,
                variety=crop_data.variety,
                expected_quantity_kg=crop_data.expected_quantity_kg,
                harvest_period=crop_data.harvest_period
            )
            db.add(crop)

    # Audit log
    db.add(AuditLog(
        user_id=user.id,
        action="FARMER_REGISTRATION",
        entity_type="FarmerProfile",
        entity_id=farmer_profile.id,
        details=f"Farmer {user.full_name} registered with code {farmer_code}"
    ))

    db.commit()
    db.refresh(user)

    # Generate token
    access_token = create_access_token(data={"sub": user.id, "role": user.role})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        preferred_language=user.preferred_language
    )
