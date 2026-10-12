import datetime
from sqlalchemy.orm import Session
from app.core.database import engine, init_db, SessionLocal
from app.core.security import get_password_hash
from app.models.models import (
    SupportedLanguage, User, FarmerProfile, Farm, Crop,
    ProcurementCentre, ProcurementOfficer, Slot
)

LANGUAGES = [
    ("en", "English", "English"),
    ("ta", "Tamil", "தமிழ்"),
    ("hi", "Hindi", "हिन्दी"),
    ("te", "Telugu", "తెలుగు"),
    ("kn", "Kannada", "கன்னட"),
    ("ml", "Malayalam", "മലയാളം"),
    ("mr", "Marathi", "मराठी"),
    ("bn", "Bengali", "বাংলা"),
    ("gu", "Gujarati", "ગુજરાતી"),
    ("pa", "Punjabi", "ਪੰਜਾਬੀ"),
    ("or", "Odia", "ଓଡ଼ିଆ"),
    ("as", "Assamese", "অসমীয়া"),
    ("ur", "Urdu", "اردو"),
]

def seed_database(db: Session = None):
    should_close = False
    if db is None:
        init_db()
        db = SessionLocal()
        should_close = True

    try:
        print("[SEED] Seeding AGRIFLOW database...")

        # 1. Seed Languages
        for code, name, native in LANGUAGES:
            lang = db.query(SupportedLanguage).filter(SupportedLanguage.code == code).first()
            if not lang:
                db.add(SupportedLanguage(code=code, name=name, native_name=native, is_active=True))
        db.commit()

        # 2. Seed Admin User
        admin_user = db.query(User).filter(User.email == "admin@agriflow.gov.in").first()
        if not admin_user:
            admin_user = User(
                email="admin@agriflow.gov.in",
                password_hash=get_password_hash("AdminPass123!"),
                role="ADMIN",
                full_name="AgriFlow Central Admin",
                phone="+919876543210",
                preferred_language="en",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print("  [OK] Admin user created: admin@agriflow.gov.in / AdminPass123!")

        # 3. Seed Procurement Centres
        centres_data = [
            {
                "code": "PC-TN-CBE-01",
                "name": "Coimbatore Agricultural Procurement Hub",
                "address": "124 APMC Market Road, Thondamuthur",
                "district": "Coimbatore",
                "state": "Tamil Nadu",
                "daily_capacity_kg": 75000.0,
                "active_counters": 4,
                "avg_processing_mins_per_farmer": 12,
                "latitude": 11.0055,
                "longitude": 76.9661
            },
            {
                "code": "PC-KA-MYS-01",
                "name": "Mysuru Grains & Paddy Procurement Center",
                "address": "88 APMC Yard, Bandipalya",
                "district": "Mysuru",
                "state": "Karnataka",
                "daily_capacity_kg": 60000.0,
                "active_counters": 3,
                "avg_processing_mins_per_farmer": 15,
                "latitude": 12.2958,
                "longitude": 76.6394
            },
            {
                "code": "PC-PB-LDH-01",
                "name": "Ludhiana Wheat Procurement Mandi",
                "address": "Main Grain Market, Gill Road",
                "district": "Ludhiana",
                "state": "Punjab",
                "daily_capacity_kg": 100000.0,
                "active_counters": 6,
                "avg_processing_mins_per_farmer": 10,
                "latitude": 30.9010,
                "longitude": 75.8573
            }
        ]

        created_centres = []
        for cdata in centres_data:
            centre = db.query(ProcurementCentre).filter(ProcurementCentre.code == cdata["code"]).first()
            if not centre:
                centre = ProcurementCentre(**cdata)
                db.add(centre)
                db.commit()
                db.refresh(centre)
            created_centres.append(centre)

        print(f"  [OK] {len(created_centres)} Procurement Centres active.")

        # 4. Seed Officer User
        officer_user = db.query(User).filter(User.email == "officer.coimbatore@agriflow.gov.in").first()
        if not officer_user:
            officer_user = User(
                email="officer.coimbatore@agriflow.gov.in",
                password_hash=get_password_hash("OfficerPass123!"),
                role="PROCUREMENT_OFFICER",
                full_name="K. Ramanathan (Procurement Officer)",
                phone="+919876543211",
                preferred_language="ta",
                is_active=True
            )
            db.add(officer_user)
            db.commit()
            db.refresh(officer_user)

            officer_profile = ProcurementOfficer(
                user_id=officer_user.id,
                centre_id=created_centres[0].id,
                counter_number=1,
                is_on_duty=True
            )
            db.add(officer_profile)
            db.commit()
            print("  [OK] Officer user created: officer.coimbatore@agriflow.gov.in / OfficerPass123!")

        # 5. Seed Slots for today and next 3 days
        today = datetime.date.today()
        slot_times = [
            (datetime.time(8, 0), datetime.time(10, 0)),
            (datetime.time(10, 0), datetime.time(12, 0)),
            (datetime.time(13, 0), datetime.time(15, 0)),
            (datetime.time(15, 0), datetime.time(17, 0)),
        ]

        for centre in created_centres:
            for day_offset in range(4):
                slot_date = today + datetime.timedelta(days=day_offset)
                for start_t, end_t in slot_times:
                    existing = db.query(Slot).filter(
                        Slot.centre_id == centre.id,
                        Slot.slot_date == slot_date,
                        Slot.start_time == start_t
                    ).first()
                    if not existing:
                        slot = Slot(
                            centre_id=centre.id,
                            slot_date=slot_date,
                            start_time=start_t,
                            end_time=end_t,
                            max_capacity_kg=15000.0,
                            booked_capacity_kg=0.0,
                            max_farmers=25,
                            booked_farmers=0,
                            is_available=True
                        )
                        db.add(slot)
        db.commit()
        print("  [OK] Time slots created for procurement centres.")

        # 6. Seed Sample Farmer User
        farmer_user = db.query(User).filter(User.email == "farmer.selvam@gmail.com").first()
        if not farmer_user:
            farmer_user = User(
                email="farmer.selvam@gmail.com",
                password_hash=get_password_hash("FarmerPass123!"),
                role="FARMER",
                full_name="Selvam Arumugam",
                phone="+919876543212",
                preferred_language="ta",
                is_active=True
            )
            db.add(farmer_user)
            db.commit()
            db.refresh(farmer_user)

            farmer_profile = FarmerProfile(
                user_id=farmer_user.id,
                farmer_code="FARM-2026-9810",
                address="45 Green Fields, Thondamuthur Main Road",
                village="Thondamuthur",
                district="Coimbatore",
                state="Tamil Nadu",
                ifsc_code="SBIN0001234"
            )
            db.add(farmer_profile)
            db.commit()
            db.refresh(farmer_profile)

            farm = Farm(
                farmer_id=farmer_profile.id,
                farm_name="Green Acres Organic Farm",
                location_address="Thondamuthur, Coimbatore",
                district="Coimbatore",
                land_area_acres=4.5,
                latitude=11.0012,
                longitude=76.9550
            )
            db.add(farm)
            db.commit()
            db.refresh(farm)

            crop1 = Crop(
                farm_id=farm.id,
                crop_name="Paddy (Rice)",
                variety="Ponni High Yield",
                expected_quantity_kg=3500.0,
                harvest_period="September 2026"
            )
            crop2 = Crop(
                farm_id=farm.id,
                crop_name="Maize",
                variety="Hybrid Yellow Maize",
                expected_quantity_kg=2000.0,
                harvest_period="October 2026"
            )
            db.add_all([crop1, crop2])
            db.commit()
            print("  [OK] Sample Farmer created: farmer.selvam@gmail.com / FarmerPass123!")

        print("[SUCCESS] Database seeding complete!")

    except Exception as e:
        print(f"[ERROR] Error during seeding: {e}")
        db.rollback()
    finally:
        if should_close:
            db.close()

if __name__ == "__main__":
    seed_database()
