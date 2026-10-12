import uuid
import datetime
from sqlalchemy import (
    Column, String, Boolean, DateTime, Date, Time, Integer, Numeric, Text, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class SupportedLanguage(Base):
    __tablename__ = 'supported_languages'
    code = Column(String(10), primary_key=True)
    name = Column(String(50), nullable=False)
    native_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class User(Base):
    __tablename__ = 'users'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False)  # FARMER, PROCUREMENT_OFFICER, ADMIN
    full_name = Column(String(150), nullable=False)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    preferred_language = Column(String(10), ForeignKey('supported_languages.code'), default='en')
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    farmer_profile = relationship("FarmerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    officer_profile = relationship("ProcurementOfficer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class FarmerProfile(Base):
    __tablename__ = 'farmer_profiles'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    farmer_code = Column(String(30), unique=True, nullable=False, index=True)
    address = Column(Text, nullable=False)
    village = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    bank_account_hash = Column(String(255), nullable=True)
    ifsc_code = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="farmer_profile")
    farms = relationship("Farm", back_populates="farmer", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="farmer", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="farmer", cascade="all, delete-orphan")

class Farm(Base):
    __tablename__ = 'farms'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    farmer_id = Column(String(36), ForeignKey('farmer_profiles.id', ondelete='CASCADE'), nullable=False)
    farm_name = Column(String(100), nullable=False)
    location_address = Column(Text, nullable=False)
    district = Column(String(100), nullable=False)
    land_area_acres = Column(Numeric(10, 2), nullable=False)
    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    farmer = relationship("FarmerProfile", back_populates="farms")
    crops = relationship("Crop", back_populates="farm", cascade="all, delete-orphan")

class Crop(Base):
    __tablename__ = 'crops'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    farm_id = Column(String(36), ForeignKey('farms.id', ondelete='CASCADE'), nullable=False)
    crop_name = Column(String(100), nullable=False)
    variety = Column(String(100), nullable=False)
    expected_quantity_kg = Column(Numeric(12, 2), nullable=False)
    harvest_period = Column(String(100), nullable=False)
    status = Column(String(30), default='ACTIVE')
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    farm = relationship("Farm", back_populates="crops")
    bookings = relationship("Booking", back_populates="crop")

class ProcurementCentre(Base):
    __tablename__ = 'procurement_centres'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(30), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    address = Column(Text, nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    daily_capacity_kg = Column(Numeric(12, 2), default=50000.0)
    active_counters = Column(Integer, default=4)
    avg_processing_mins_per_farmer = Column(Integer, default=15)
    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    officers = relationship("ProcurementOfficer", back_populates="centre")
    slots = relationship("Slot", back_populates="centre", cascade="all, delete-orphan")
    queue_tokens = relationship("QueueToken", back_populates="centre")

class ProcurementOfficer(Base):
    __tablename__ = 'procurement_officers'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    centre_id = Column(String(36), ForeignKey('procurement_centres.id', ondelete='CASCADE'), nullable=False)
    counter_number = Column(Integer, default=1)
    is_on_duty = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="officer_profile")
    centre = relationship("ProcurementCentre", back_populates="officers")

class Slot(Base):
    __tablename__ = 'slots'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    centre_id = Column(String(36), ForeignKey('procurement_centres.id', ondelete='CASCADE'), nullable=False)
    slot_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    max_capacity_kg = Column(Numeric(12, 2), default=10000.0)
    booked_capacity_kg = Column(Numeric(12, 2), default=0.0)
    max_farmers = Column(Integer, default=30)
    booked_farmers = Column(Integer, default=0)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    centre = relationship("ProcurementCentre", back_populates="slots")
    bookings = relationship("Booking", back_populates="slot")

    __table_args__ = (
        UniqueConstraint('centre_id', 'slot_date', 'start_time', name='_centre_slot_unique'),
    )

class Booking(Base):
    __tablename__ = 'bookings'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    booking_code = Column(String(30), unique=True, nullable=False, index=True)
    farmer_id = Column(String(36), ForeignKey('farmer_profiles.id', ondelete='CASCADE'), nullable=False)
    slot_id = Column(String(36), ForeignKey('slots.id', ondelete='RESTRICT'), nullable=False)
    crop_id = Column(String(36), ForeignKey('crops.id', ondelete='RESTRICT'), nullable=False)
    expected_quantity_kg = Column(Numeric(12, 2), nullable=False)
    status = Column(String(30), default='BOOKED')  # BOOKED, ARRIVED, WAITING, CALLED, PROCESSING, COMPLETED, NO_SHOW, CANCELLED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    farmer = relationship("FarmerProfile", back_populates="bookings")
    slot = relationship("Slot", back_populates="bookings")
    crop = relationship("Crop", back_populates="bookings")
    queue_token = relationship("QueueToken", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    procurement = relationship("Procurement", back_populates="booking", uselist=False)

class QueueToken(Base):
    __tablename__ = 'queue_tokens'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    token_number = Column(String(20), nullable=False)
    booking_id = Column(String(36), ForeignKey('bookings.id', ondelete='CASCADE'), unique=True, nullable=False)
    centre_id = Column(String(36), ForeignKey('procurement_centres.id', ondelete='CASCADE'), nullable=False)
    token_date = Column(Date, nullable=False)
    position = Column(Integer, nullable=False)
    state = Column(String(30), default='BOOKED')  # BOOKED, ARRIVED, WAITING, CALLED, PROCESSING, COMPLETED, NO_SHOW, CANCELLED
    counter_assigned = Column(Integer, nullable=True)
    arrival_time = Column(DateTime, nullable=True)
    called_time = Column(DateTime, nullable=True)
    processing_start_time = Column(DateTime, nullable=True)
    completed_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    booking = relationship("Booking", back_populates="queue_token")
    centre = relationship("ProcurementCentre", back_populates="queue_tokens")
    procurement = relationship("Procurement", back_populates="token", uselist=False)

    __table_args__ = (
        UniqueConstraint('centre_id', 'token_date', 'token_number', name='_centre_token_date_unique'),
        Index('idx_queue_lookup', 'centre_id', 'token_date', 'state'),
    )

class Procurement(Base):
    __tablename__ = 'procurements'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    receipt_code = Column(String(30), unique=True, nullable=False, index=True)
    token_id = Column(String(36), ForeignKey('queue_tokens.id', ondelete='CASCADE'), unique=True, nullable=False)
    booking_id = Column(String(36), ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False)
    officer_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    actual_quantity_kg = Column(Numeric(12, 2), nullable=False)
    quality_grade = Column(String(10), nullable=False)  # Grade A, Grade B, Grade C
    moisture_content_pct = Column(Numeric(5, 2), default=12.0)
    unit_price_inr = Column(Numeric(10, 2), nullable=False)
    total_amount_inr = Column(Numeric(12, 2), nullable=False)
    status = Column(String(30), default='COMPLETED')
    remarks = Column(Text, nullable=True)
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)

    token = relationship("QueueToken", back_populates="procurement")
    booking = relationship("Booking", back_populates="procurement")
    payment = relationship("Payment", back_populates="procurement", uselist=False, cascade="all, delete-orphan")

class Payment(Base):
    __tablename__ = 'payments'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    payment_ref = Column(String(40), unique=True, nullable=False, index=True)
    booking_id = Column(String(36), ForeignKey('bookings.id', ondelete='SET NULL'), nullable=True)
    procurement_id = Column(String(36), ForeignKey('procurements.id', ondelete='SET NULL'), unique=True, nullable=True)
    farmer_id = Column(String(36), ForeignKey('farmer_profiles.id', ondelete='CASCADE'), nullable=False)
    razorpay_order_id = Column(String(100), unique=True, nullable=True, index=True)
    razorpay_payment_id = Column(String(100), unique=True, nullable=True, index=True)
    razorpay_signature = Column(String(255), nullable=True)
    amount_inr = Column(Numeric(12, 2), nullable=False, default=10.0)
    currency = Column(String(10), default='INR')
    payment_status = Column(String(30), default='PENDING')  # PENDING, SUCCESS, FAILED, REFUNDED
    bank_ref_number = Column(String(100), nullable=True)
    failure_reason = Column(Text, nullable=True)
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    procurement = relationship("Procurement", back_populates="payment")
    farmer = relationship("FarmerProfile", back_populates="payments")

class Notification(Base):
    __tablename__ = 'notifications'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    language = Column(String(10), default='en')
    event_type = Column(String(50), nullable=False)
    is_read = Column(Boolean, default=False)
    channel = Column(String(20), default='SMS')
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")
    logs = relationship("NotificationLog", back_populates="notification", cascade="all, delete-orphan")

class NotificationLog(Base):
    __tablename__ = 'notification_logs'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    notification_id = Column(String(36), ForeignKey('notifications.id', ondelete='SET NULL'), nullable=True)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    recipient_phone = Column(String(20), nullable=False)
    masked_phone_number = Column(String(20), nullable=True)
    provider = Column(String(30), default='TWILIO')
    event_type = Column(String(50), nullable=False)
    language = Column(String(10), nullable=False)
    rendered_message = Column(Text, nullable=False)
    provider_message_id = Column(String(100), nullable=True)
    delivery_status = Column(String(30), default='QUEUED')  # QUEUED, SENT, DELIVERED, UNDELIVERED, FAILED
    error_code = Column(String(50), nullable=True)
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)

    notification = relationship("Notification", back_populates="logs")

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
