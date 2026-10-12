import pytest
from pydantic import ValidationError
import datetime
from app.schemas.schemas import (
    LoginRequest,
    FarmerRegisterRequest,
    CropCreate,
    FarmCreate,
    BookingCreate,
    ProcurementCreate,
    CreateRazorpayOrderRequest,
    VerifyPaymentRequest,
)
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    RoleChecker,
)
from app.models.models import User

# --- 1. Schema & Validation Boundary Tests ---

def test_login_request_validation():
    # Valid login
    req = LoginRequest(email="farmer.selvam@gmail.com", password="FarmerPass123!")
    assert req.email == "farmer.selvam@gmail.com"
    assert req.password == "FarmerPass123!"

    # Invalid email structure rejected
    with pytest.raises(ValidationError):
        LoginRequest(email="not-an-email", password="pass")

def test_crop_create_quantity_boundary():
    # Positive quantity valid
    crop = CropCreate(
        crop_name="Paddy",
        variety="Ponni",
        expected_quantity_kg=1500.0,
        harvest_period="Sept 2026"
    )
    assert crop.expected_quantity_kg == 1500.0

    # Non-positive quantities (zero or negative) rejected by gt=0 constraint
    with pytest.raises(ValidationError):
        CropCreate(
            crop_name="Paddy",
            variety="Ponni",
            expected_quantity_kg=0.0,
            harvest_period="Sept 2026"
        )

    with pytest.raises(ValidationError):
        CropCreate(
            crop_name="Paddy",
            variety="Ponni",
            expected_quantity_kg=-500.0,
            harvest_period="Sept 2026"
        )

def test_farm_create_boundary():
    # Valid farm
    farm = FarmCreate(
        farm_name="Green Acres",
        location_address="Thondamuthur",
        district="Coimbatore",
        land_area_acres=3.5,
        crops=[
            CropCreate(
                crop_name="Maize",
                variety="Yellow",
                expected_quantity_kg=1000.0,
                harvest_period="Oct 2026"
            )
        ]
    )
    assert farm.land_area_acres == 3.5
    assert len(farm.crops) == 1

    # Zero or negative land area rejected
    with pytest.raises(ValidationError):
        FarmCreate(
            farm_name="Invalid Farm",
            location_address="Thondamuthur",
            district="Coimbatore",
            land_area_acres=0.0,
            crops=[]
        )

def test_booking_create_boundary():
    # Valid booking create
    booking = BookingCreate(
        centre_id="centre-uuid-1",
        slot_id="slot-uuid-1",
        crop_id="crop-uuid-1",
        expected_quantity_kg=2000.0,
        travel_time_mins=45
    )
    assert booking.expected_quantity_kg == 2000.0

    # Negative quantity rejected
    with pytest.raises(ValidationError):
        BookingCreate(
            centre_id="centre-uuid-1",
            slot_id="slot-uuid-1",
            crop_id="crop-uuid-1",
            expected_quantity_kg=-100.0
        )

def test_razorpay_order_schemas():
    order_req = CreateRazorpayOrderRequest(
        centre_id="c-1",
        slot_id="s-1",
        crop_id="cr-1",
        expected_quantity_kg=500.0
    )
    assert order_req.expected_quantity_kg == 500.0

    verify_req = VerifyPaymentRequest(
        razorpay_order_id="order_123456",
        razorpay_payment_id="pay_123456",
        razorpay_signature="sig_123456",
        centre_id="c-1",
        slot_id="s-1",
        crop_id="cr-1",
        expected_quantity_kg=500.0
    )
    assert verify_req.razorpay_order_id == "order_123456"

def test_procurement_create_boundary():
    proc = ProcurementCreate(
        token_id="tok-1",
        actual_quantity_kg=1200.0,
        quality_grade="Grade A",
        moisture_content_pct=11.5,
        unit_price_inr=22.50
    )
    assert proc.actual_quantity_kg == 1200.0
    assert proc.unit_price_inr == 22.50

    # Negative unit price rejected
    with pytest.raises(ValidationError):
        ProcurementCreate(
            token_id="tok-1",
            actual_quantity_kg=1200.0,
            quality_grade="Grade A",
            moisture_content_pct=11.5,
            unit_price_inr=-5.0
        )

# --- 2. Security & Cryptographic Hashing Unit Tests ---

def test_password_hashing_and_verification():
    plain = "SuperSecureFarmer2026!"
    hashed = get_password_hash(plain)

    # Hash should be non-empty and not equal to plaintext
    assert hashed != plain
    assert len(hashed) > 20

    # Verification passes with correct password
    assert verify_password(plain, hashed) is True

    # Verification fails with wrong password
    assert verify_password("WrongPassword123", hashed) is False
    assert verify_password("", hashed) is False

def test_jwt_access_token_generation():
    payload = {"sub": "user-uuid-999", "role": "FARMER"}
    token = create_access_token(data=payload, expires_delta=datetime.timedelta(minutes=15))

    assert isinstance(token, str)
    assert len(token) > 30

def test_role_checker_authorization():
    farmer_checker = RoleChecker(["FARMER", "ADMIN"])
    officer_checker = RoleChecker(["PROCUREMENT_OFFICER", "ADMIN"])

    farmer_user = User(id="u1", email="farmer@test.com", role="FARMER", full_name="Farmer", phone="+919000000001", password_hash="h")
    officer_user = User(id="u2", email="officer@test.com", role="PROCUREMENT_OFFICER", full_name="Officer", phone="+919000000002", password_hash="h")
    admin_user = User(id="u3", email="admin@test.com", role="ADMIN", full_name="Admin", phone="+919000000003", password_hash="h")

    # Farmer allowed for farmer routes
    assert farmer_checker(farmer_user) == farmer_user
    # Admin allowed for farmer routes
    assert farmer_checker(admin_user) == admin_user

    # Farmer denied for officer routes
    with pytest.raises(Exception):
        officer_checker(farmer_user)

    # Officer allowed for officer routes
    assert officer_checker(officer_user) == officer_user
