import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import get_db, Base
from app.models.models import User, ProcurementCentre, Slot, FarmerProfile
from app.services.sms_service import render_sms_message, format_and_validate_e164, mask_phone_number

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_agriflow.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    from seed import seed_database
    seed_database(db)
    yield
    db.close()

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_farmer_registration_and_login():
    reg_payload = {
        "email": "test.farmer.rzp1@agriflow.org",
        "password": "FarmerPassword123!",
        "full_name": "Test Farmer India",
        "phone": "+919998887771",
        "preferred_language": "ta",
        "address": "100 Field St",
        "village": "Test Village",
        "district": "Coimbatore",
        "state": "Tamil Nadu",
        "farms": [
            {
                "farm_name": "Test Field",
                "location_address": "Test Village",
                "district": "Coimbatore",
                "land_area_acres": 5.0,
                "crops": [
                    {
                        "crop_name": "Paddy (Rice)",
                        "variety": "Ponni",
                        "expected_quantity_kg": 3000.0,
                        "harvest_period": "Sept 2026"
                    }
                ]
            }
        ]
    }
    res = client.post("/api/v1/auth/farmer/register", json=reg_payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "FARMER"

    login_res = client.post("/api/v1/auth/login", json={
        "email": "test.farmer.rzp1@agriflow.org",
        "password": "FarmerPassword123!"
    })
    assert login_res.status_code == 200
    assert login_res.json()["email"] == "test.farmer.rzp1@agriflow.org"

def test_razorpay_order_and_verification():
    # 1. Register fresh farmer
    reg_payload = {
        "email": "test.farmer.rzp2@agriflow.org",
        "password": "FarmerPassword123!",
        "full_name": "Razorpay Farmer Test",
        "phone": "+919998887772",
        "preferred_language": "en",
        "address": "200 Green Ave",
        "village": "Thondamuthur",
        "district": "Coimbatore",
        "state": "Tamil Nadu",
        "farms": [
            {
                "farm_name": "Coimbatore Field",
                "location_address": "Thondamuthur",
                "district": "Coimbatore",
                "land_area_acres": 4.0,
                "crops": [
                    {
                        "crop_name": "Paddy (Rice)",
                        "variety": "Ponni",
                        "expected_quantity_kg": 2500.0,
                        "harvest_period": "Sept 2026"
                    }
                ]
            }
        ]
    }
    reg_res = client.post("/api/v1/auth/farmer/register", json=reg_payload)
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Centre & Slot & Crop
    centres = client.get("/api/v1/centres").json()
    centre_id = centres[0]["id"]
    slots = client.get(f"/api/v1/slots?centre_id={centre_id}").json()
    slot_id = slots[0]["id"]
    crops = client.get("/api/v1/farmers/crops", headers=headers).json()
    crop_id = crops[0]["id"]

    # 3. Create Razorpay Order (Enforces 1000 paise / ₹10)
    order_res = client.post("/api/v1/bookings/create-order", json={
        "centre_id": centre_id,
        "slot_id": slot_id,
        "crop_id": crop_id,
        "expected_quantity_kg": 2000.0
    }, headers=headers)
    assert order_res.status_code == 201
    order_data = order_res.json()
    assert order_data["amount_paise"] == 1000
    assert order_data["amount_inr"] == 10.0
    assert "order_id" in order_data

    # 4. Verify Payment & Confirm Booking
    verify_res = client.post("/api/v1/payments/verify", json={
        "razorpay_order_id": order_data["order_id"],
        "razorpay_payment_id": "pay_test_12345678",
        "razorpay_signature": "signature_test_12345678",
        "centre_id": centre_id,
        "slot_id": slot_id,
        "crop_id": crop_id,
        "expected_quantity_kg": 2000.0
    }, headers=headers)
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["verified"] is True
    assert "booking_code" in verify_data
    assert "token_number" in verify_data

def test_multilingual_sms_rendering():
    english_msg = render_sms_message(
        "SLOT_BOOKED",
        "en",
        {"booking_code": "AGRI-99112", "date": "2026-09-18", "token_number": "A47"}
    )
    assert "AGRI-99112" in english_msg
    assert "A47" in english_msg

def test_sms_e164_formatting_and_masking():
    # Validation tests
    assert format_and_validate_e164("9876543210") == "+919876543210"
    assert format_and_validate_e164("+919876543210") == "+919876543210"
    assert format_and_validate_e164("09876543210") == "+919876543210"
    
    # Masking tests
    assert mask_phone_number("+919876543210") == "+91******3210"
    assert mask_phone_number("+919876549810") == "+91******9810"

def test_test_sms_endpoint_authenticated():
    # Login as seed farmer
    login_res = client.post("/api/v1/auth/login", json={
        "email": "farmer.selvam@gmail.com",
        "password": "FarmerPass123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Call test SMS route
    res = client.post("/api/v1/notifications/test-sms", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "recipient_phone_masked" in data
    assert "+91******" in data["recipient_phone_masked"]
    assert "rendered_message" in data

def test_twilio_status_webhook():
    webhook_res = client.post("/api/v1/notifications/twilio-status", data={
        "MessageSid": "SM_TEST_WEBHOOK_123",
        "MessageStatus": "delivered",
        "ErrorCode": ""
    })
    assert webhook_res.status_code == 200
    assert webhook_res.json()["status"] == "processed"
