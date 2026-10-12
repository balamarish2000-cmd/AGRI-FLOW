from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.schemas import LoginRequest, FarmerRegisterRequest, TokenResponse, UserResponse
from app.services.auth_service import authenticate_user, register_farmer
from app.services.sms_service import send_sms_notification
from app.models.models import User, FarmerProfile

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    return authenticate_user(db, credentials)

@router.post("/token", response_model=TokenResponse)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    credentials = LoginRequest(email=form_data.username, password=form_data.password)
    return authenticate_user(db, credentials)

@router.post("/farmer/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: FarmerRegisterRequest, db: Session = Depends(get_db)):
    token_res = register_farmer(db, req)
    
    # Get created farmer code
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == token_res.user_id).first()
    farmer_code = profile.farmer_code if profile else "FARM-NEW"

    # Trigger Registration Confirmation SMS
    send_sms_notification(
        db=db,
        user_id=token_res.user_id,
        recipient_phone=req.phone,
        event_type="REGISTRATION_SUCCESS",
        language=req.preferred_language,
        context={"farmer_code": farmer_code},
        title="Registration Successful"
    )

    return token_res

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
