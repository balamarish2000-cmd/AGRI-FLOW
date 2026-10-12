# AGRIFLOW API Specification & Technical Reference

**Version:** 1.0.0  
**Base URL:** `http://localhost:8000/api/v1`  
**Interactive Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)  
**ReDoc Documentation:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 1. Authentication & Security Architecture

* **Authentication Scheme:** HTTP Bearer JWT (`Authorization: Bearer <token>`)
* **Token Lifetime:** 30 days (`ACCESS_TOKEN_EXPIRE_MINUTES=43200`)
* **Signature Algorithm:** HMAC-SHA256 (`HS256`)
* **Role-Based Access Control (RBAC):**
  * `FARMER`: Slot booking, payment submission, personal queue tracking, crop management.
  * `PROCUREMENT_OFFICER`: Center counter management, token calling, physical quality/quantity receipt entry.
  * `ADMIN`: Center management, analytics, full system audit log access.

---

## 2. Authentication Endpoints (`/auth`)

### 2.1 Farmer / Officer / Admin Login
* **Path:** `POST /auth/login`
* **Access:** Public
* **Request Body:**
  ```json
  {
    "email": "farmer.selvam@gmail.com",
    "password": "FarmerPass123!"
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user_id": "9e237173-00f5-4314-be43-d5f1e2476f73",
    "email": "farmer.selvam@gmail.com",
    "full_name": "Selvam Arumugam",
    "role": "FARMER",
    "preferred_language": "ta"
  }
  ```
* **Error Response (`401 Unauthorized`):**
  ```json
  {
    "detail": "Invalid email or password"
  }
  ```

### 2.2 Farmer Registration
* **Path:** `POST /auth/farmer/register`
* **Access:** Public
* **Validation Rules:**
  * `phone`: Valid Indian mobile number (E.164 +91XXXXXXXXXX).
  * `password`: Minimum 8 characters.
  * `farms`: At least one farm with valid positive `land_area_acres` and `expected_quantity_kg`.
* **Request Body:**
  ```json
  {
    "email": "new.farmer@agriflow.org",
    "password": "FarmerPassword123!",
    "full_name": "Ramesh Kumar",
    "phone": "+919876543210",
    "preferred_language": "ta",
    "address": "45 North Street",
    "village": "Thondamuthur",
    "district": "Coimbatore",
    "state": "Tamil Nadu",
    "ifsc_code": "SBIN0001234",
    "farms": [
      {
        "farm_name": "Kaveri River Farm",
        "location_address": "Thondamuthur",
        "district": "Coimbatore",
        "land_area_acres": 4.5,
        "crops": [
          {
            "crop_name": "Paddy (Rice)",
            "variety": "Ponni",
            "expected_quantity_kg": 3000.0,
            "harvest_period": "November 2026"
          }
        ]
      }
    ]
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user_id": "4182a445-2464-4967-ae15-1ddd48ed6830",
    "email": "new.farmer@agriflow.org",
    "full_name": "Ramesh Kumar",
    "role": "FARMER",
    "preferred_language": "ta"
  }
  ```

### 2.3 Current Authenticated User Profile
* **Path:** `GET /auth/me`
* **Access:** Authenticated (`Bearer <token>`)
* **Success Response (`200 OK`):**
  ```json
  {
    "id": "4182a445-2464-4967-ae15-1ddd48ed6830",
    "email": "new.farmer@agriflow.org",
    "full_name": "Ramesh Kumar",
    "phone": "+919876543210",
    "role": "FARMER",
    "preferred_language": "ta",
    "is_active": true,
    "created_at": "2026-10-12T08:10:55.123456"
  }
  ```

---

## 3. Farmers & Crops Endpoints (`/farmers`)

### 3.1 Get Farmer Profile
* **Path:** `GET /farmers/profile`
* **Access:** Role `FARMER`, `ADMIN`
* **Response (`200 OK`):**
  ```json
  {
    "id": "fp-1",
    "user_id": "u-1",
    "farmer_code": "FARM-2026-9810",
    "address": "45 Green Fields, Thondamuthur",
    "village": "Thondamuthur",
    "district": "Coimbatore",
    "state": "Tamil Nadu",
    "ifsc_code": "SBIN0001234",
    "farms": [...]
  }
  ```

### 3.2 List Farmer Crops
* **Path:** `GET /farmers/crops`
* **Access:** Role `FARMER`, `ADMIN`
* **Response (`200 OK`):**
  ```json
  [
    {
      "id": "crop-1",
      "farm_id": "farm-1",
      "crop_name": "Paddy (Rice)",
      "variety": "Ponni High Yield",
      "expected_quantity_kg": 3500.0,
      "harvest_period": "September 2026",
      "status": "ACTIVE",
      "created_at": "2026-10-12T05:30:00"
    }
  ]
  ```

---

## 4. Procurement Centres & Slots (`/centres`, `/slots`)

### 4.1 List Procurement Centres
* **Path:** `GET /centres/`
* **Access:** Public / Authenticated
* **Response (`200 OK`):**
  ```json
  [
    {
      "id": "c-cbe-01",
      "code": "PC-TN-CBE-01",
      "name": "Coimbatore Agricultural Procurement Hub",
      "address": "124 APMC Market Road, Thondamuthur",
      "district": "Coimbatore",
      "state": "Tamil Nadu",
      "daily_capacity_kg": 75000.0,
      "active_counters": 4,
      "avg_processing_mins_per_farmer": 12,
      "is_active": true,
      "created_at": "2026-10-12T05:30:00"
    }
  ]
  ```

### 4.2 List Time Slots
* **Path:** `GET /slots/?centre_id={centre_id}&date={date}`
* **Access:** Public / Authenticated
* **Query Parameters:**
  * `centre_id` (string, required): UUID of target procurement centre.
  * `date` (string, optional): ISO date filter `YYYY-MM-DD`.
* **Response (`200 OK`):**
  ```json
  [
    {
      "id": "slot-1",
      "centre_id": "c-cbe-01",
      "slot_date": "2026-10-15",
      "start_time": "08:00:00",
      "end_time": "10:00:00",
      "max_capacity_kg": 15000.0,
      "booked_capacity_kg": 3500.0,
      "max_farmers": 25,
      "booked_farmers": 1,
      "is_available": true
    }
  ]
  ```

---

## 5. Booking & ₹10 Razorpay Flow (`/bookings`, `/payments`)

### 5.1 Create ₹10 Booking Order
* **Path:** `POST /bookings/create-order`
* **Access:** Role `FARMER`, `ADMIN`
* **Constraint:** Strictly creates order for 1000 paise (₹10.00).
* **Request Body:**
  ```json
  {
    "centre_id": "c-cbe-01",
    "slot_id": "slot-1",
    "crop_id": "crop-1",
    "expected_quantity_kg": 2000.0
  }
  ```
* **Response (`201 Created`):**
  ```json
  {
    "order_id": "order_78129482",
    "amount_paise": 1000,
    "amount_inr": 10.0,
    "currency": "INR",
    "key_id": "rzp_test_agriflow_sample_key_id",
    "farmer_name": "Selvam Arumugam",
    "farmer_email": "farmer.selvam@gmail.com",
    "farmer_phone": "+919876543212"
  }
  ```

### 5.2 Verify Razorpay Payment & Confirm Slot
* **Path:** `POST /payments/verify`
* **Access:** Role `FARMER`, `ADMIN`
* **Logic:** Verifies HMAC-SHA256 signature (`order_id|payment_id`). Locks slot atomically with `with_for_update()`. Generates token, dispatches SMS.
* **Request Body:**
  ```json
  {
    "razorpay_order_id": "order_78129482",
    "razorpay_payment_id": "pay_98217391",
    "razorpay_signature": "a8fbc7189d9841...",
    "centre_id": "c-cbe-01",
    "slot_id": "slot-1",
    "crop_id": "crop-1",
    "expected_quantity_kg": 2000.0
  }
  ```
* **Response (`200 OK`):**
  ```json
  {
    "verified": true,
    "booking_code": "AGRI-84192",
    "token_number": "A02",
    "centre_name": "Coimbatore Agricultural Procurement Hub",
    "slot_date": "2026-10-15",
    "start_time": "08:00:00",
    "amount_paid_inr": 10.0,
    "payment_id": "pay_98217391"
  }
  ```

---

## 6. Live Queue Management (`/queue`)

### 6.1 Get Live Centre Queue
* **Path:** `GET /queue/live/{centre_id}`
* **Access:** Public / Authenticated
* **Response (`200 OK`):**
  ```json
  {
    "centre_id": "c-cbe-01",
    "centre_name": "Coimbatore Agricultural Procurement Hub",
    "active_counters": 4,
    "currently_called": [
      {
        "token_number": "A01",
        "counter": 1,
        "called_time": "2026-10-15T08:15:00"
      }
    ],
    "waiting_tokens": [
      { "token_number": "A02", "position": 2 }
    ],
    "completed_today_count": 14,
    "average_wait_mins": 12
  }
  ```

### 6.2 Advance Queue Token State
* **Path:** `POST /queue/transition`
* **Access:** Role `PROCUREMENT_OFFICER`, `ADMIN`
* **Valid Transitions:**
  * `BOOKED` → `ARRIVED`
  * `ARRIVED` → `WAITING` | `CALLED`
  * `WAITING` → `CALLED` | `NO_SHOW`
  * `CALLED` → `PROCESSING` | `NO_SHOW`
  * `PROCESSING` → `COMPLETED`
* **Request Body:**
  ```json
  {
    "token_id": "token-uuid-1",
    "new_state": "CALLED",
    "counter_number": 2
  }
  ```

---

## 7. Notifications & Real SMS (`/notifications`)

### 7.1 Send Real Test SMS
* **Path:** `POST /notifications/test-sms`
* **Access:** Authenticated Farmer
* **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message_sid": "SM91a82fbc...",
    "status": "QUEUED",
    "recipient_phone_masked": "+91******3212",
    "rendered_message": "AgriFlow: Test SMS verification successful for registered number +91******3212. Status: ONLINE."
  }
  ```

### 7.2 Twilio Delivery Webhook
* **Path:** `POST /notifications/twilio-status`
* **Access:** Public (Twilio Server Callback)
* **Form Parameters:** `MessageSid`, `MessageStatus`, `ErrorCode`, `ErrorMessage`
* **Response (`200 OK`):**
  ```json
  {
    "status": "processed",
    "message_sid": "SM91a82fbc...",
    "delivery_status": "DELIVERED"
  }
  ```

---

## 8. WebSocket Stream

* **URL:** `ws://localhost:8000/ws/queue/{centre_id}`
* **Payload Protocol:** JSON broadcasts on token state change (`event: "QUEUE_UPDATE"`).
