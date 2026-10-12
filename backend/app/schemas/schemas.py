from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
import datetime

# --- Auth Schemas ---
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: str
    role: str
    preferred_language: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: str
    role: str
    preferred_language: str
    is_active: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Farmer Schemas ---
class CropCreate(BaseModel):
    crop_name: str
    variety: str
    expected_quantity_kg: float = Field(gt=0)
    harvest_period: str

class CropResponse(BaseModel):
    id: str
    farm_id: str
    crop_name: str
    variety: str
    expected_quantity_kg: float
    harvest_period: str
    status: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class FarmCreate(BaseModel):
    farm_name: str
    location_address: str
    district: str
    land_area_acres: float = Field(gt=0)
    crops: List[CropCreate]

class FarmResponse(BaseModel):
    id: str
    farmer_id: str
    farm_name: str
    location_address: str
    district: str
    land_area_acres: float
    crops: List[CropResponse] = []
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class FarmerRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    preferred_language: str = "en"
    address: str
    village: str
    district: str
    state: str
    bank_account_info: Optional[str] = None
    ifsc_code: Optional[str] = None
    farms: List[FarmCreate]

class FarmerProfileResponse(BaseModel):
    id: str
    user_id: str
    farmer_code: str
    address: str
    village: str
    district: str
    state: str
    ifsc_code: Optional[str] = None
    user: UserResponse
    farms: List[FarmResponse] = []
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Procurement Centre & Slot Schemas ---
class ProcurementCentreCreate(BaseModel):
    code: str
    name: str
    address: str
    district: str
    state: str
    daily_capacity_kg: float = 50000.0
    active_counters: int = 4
    avg_processing_mins_per_farmer: int = 15
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ProcurementCentreResponse(BaseModel):
    id: str
    code: str
    name: str
    address: str
    district: str
    state: str
    daily_capacity_kg: float
    active_counters: int
    avg_processing_mins_per_farmer: int
    is_active: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class SlotCreate(BaseModel):
    centre_id: str
    slot_date: datetime.date
    start_time: str  # e.g., "09:00:00"
    end_time: str    # e.g., "11:00:00"
    max_capacity_kg: float = 10000.0
    max_farmers: int = 30

class SlotResponse(BaseModel):
    id: str
    centre_id: str
    slot_date: datetime.date
    start_time: str
    end_time: str
    max_capacity_kg: float
    booked_capacity_kg: float
    max_farmers: int
    booked_farmers: int
    is_available: bool

    class Config:
        from_attributes = True

# --- Booking & Queue Schemas ---
class BookingCreate(BaseModel):
    centre_id: str
    slot_id: str
    crop_id: str
    expected_quantity_kg: float = Field(gt=0)
    travel_time_mins: Optional[int] = 30

class QueueTokenResponse(BaseModel):
    id: str
    token_number: str
    booking_id: str
    centre_id: str
    token_date: datetime.date
    position: int
    state: str
    counter_assigned: Optional[int] = None
    arrival_time: Optional[datetime.datetime] = None
    called_time: Optional[datetime.datetime] = None
    processing_start_time: Optional[datetime.datetime] = None
    completed_time: Optional[datetime.datetime] = None
    estimated_wait_mins: int = 0
    farmers_ahead: int = 0
    recommended_departure_time: Optional[str] = None
    dont_come_yet: bool = False

    class Config:
        from_attributes = True

class BookingResponse(BaseModel):
    id: str
    booking_code: str
    farmer_id: str
    slot_id: str
    crop_id: str
    expected_quantity_kg: float
    status: str
    queue_token: Optional[QueueTokenResponse] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class QueueStateTransitionRequest(BaseModel):
    token_id: str
    new_state: str  # ARRIVED, WAITING, CALLED, PROCESSING, COMPLETED, NO_SHOW, CANCELLED
    counter_number: Optional[int] = None

# --- Procurement & Payment Schemas ---
class ProcurementCreate(BaseModel):
    token_id: str
    actual_quantity_kg: float = Field(gt=0)
    quality_grade: str  # Grade A, Grade B, Grade C
    moisture_content_pct: float = 12.0
    unit_price_inr: float = Field(gt=0)
    remarks: Optional[str] = None

class ProcurementResponse(BaseModel):
    id: str
    receipt_code: str
    token_id: str
    booking_id: str
    officer_id: str
    actual_quantity_kg: float
    quality_grade: str
    moisture_content_pct: float
    unit_price_inr: float
    total_amount_inr: float
    status: str
    remarks: Optional[str] = None
    completed_at: datetime.datetime

    class Config:
        from_attributes = True

class PaymentResponse(BaseModel):
    id: str
    payment_ref: str
    procurement_id: str
    farmer_id: str
    amount_inr: float
    payment_status: str
    bank_ref_number: Optional[str] = None
    failure_reason: Optional[str] = None
    processed_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class PaymentStatusUpdateRequest(BaseModel):
    payment_status: str  # PENDING, PROCESSING, COMPLETED, FAILED
    bank_ref_number: Optional[str] = None
    failure_reason: Optional[str] = None

class NotificationLogResponse(BaseModel):
    id: str
    notification_id: Optional[str] = None
    recipient_phone: str
    masked_phone_number: Optional[str] = None
    provider: str = "TWILIO"
    event_type: str
    language: str
    rendered_message: str
    provider_message_id: Optional[str] = None
    delivery_status: str
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    sent_at: datetime.datetime

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    language: str
    event_type: str
    is_read: bool
    channel: str
    created_at: datetime.datetime
    logs: List[NotificationLogResponse] = []

    class Config:
        from_attributes = True

class TestSMSResponse(BaseModel):
    success: bool
    message_sid: Optional[str] = None
    status: str
    recipient_phone_masked: str
    rendered_message: str
    error_code: Optional[str] = None
    error: Optional[str] = None

class SMSRetryResponse(BaseModel):
    success: bool
    notification_id: str
    message_sid: Optional[str] = None
    status: str
    recipient_phone_masked: str
    error_code: Optional[str] = None
    error: Optional[str] = None

class AdminAnalyticsResponse(BaseModel):
    total_farmers: int
    active_centres: int
    todays_bookings: int
    completed_procurements: int
    pending_payments_count: int
    pending_payments_value: float
    average_waiting_time_mins: int
    centre_congestion_percentage: float

# --- Razorpay Payment Gateway Schemas ---
class CreateRazorpayOrderRequest(BaseModel):
    centre_id: str
    slot_id: str
    crop_id: str
    expected_quantity_kg: float = Field(gt=0)

class RazorpayOrderResponse(BaseModel):
    order_id: str
    amount_paise: int = 1000
    amount_inr: float = 10.0
    currency: str = "INR"
    key_id: str
    farmer_name: str
    farmer_email: str
    farmer_phone: str

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    centre_id: str
    slot_id: str
    crop_id: str
    expected_quantity_kg: float = Field(gt=0)

class PaymentVerificationResponse(BaseModel):
    verified: bool
    booking_code: str
    token_number: str
    centre_name: Optional[str] = None
    slot_date: Optional[str] = None
    start_time: Optional[str] = None
    amount_paid_inr: float = 10.0
    payment_id: str
