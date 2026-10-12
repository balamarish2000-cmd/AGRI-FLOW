import datetime
import re
import sys
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import Notification, NotificationLog

def safe_print(msg: str):
    """Safely print log messages without throwing UnicodeEncodeError on Windows CP1252 consoles."""
    try:
        print(msg)
    except UnicodeEncodeError:
        try:
            safe_msg = msg.encode('ascii', errors='backslashreplace').decode('ascii')
            print(safe_msg)
        except Exception:
            pass
    except Exception:
        pass

# E.164 Formatting and Validation Helper
def format_and_validate_e164(phone: str) -> str:
    """
    Validates and converts phone number to E.164 standard (+91XXXXXXXXXX).
    """
    if not phone:
        raise ValueError("Phone number cannot be empty")
    
    cleaned = re.sub(r'[\s\-\(\)]', '', phone.strip())
    
    if cleaned.startswith('+'):
        if re.match(r'^\+[1-9]\d{6,14}$', cleaned):
            return cleaned
        raise ValueError(f"Invalid E.164 format: {phone}")
    
    if cleaned.startswith('0'):
        cleaned = cleaned[1:]
    
    if re.match(r'^[6-9]\d{9}$', cleaned):
        return f"+91{cleaned}"
    elif re.match(r'^91[6-9]\d{9}$', cleaned):
        return f"+{cleaned}"
    
    if len(cleaned) >= 7 and len(cleaned) <= 15:
        return f"+{cleaned}"
    
    raise ValueError(f"Invalid phone number structure: {phone}")

# Phone Number Masking Helper for Logging & Privacy
def mask_phone_number(phone: str) -> str:
    """
    Masks phone numbers for safe logging (e.g. +919876543210 -> +91******3210).
    """
    if not phone:
        return ""
    if len(phone) <= 6:
        return "****"
    
    prefix = phone[:3] if phone.startswith('+') else phone[:2]
    suffix = phone[-4:]
    mask_length = max(len(phone) - len(prefix) - len(suffix), 4)
    return f"{prefix}{'*' * mask_length}{suffix}"

# Multilingual message templates for 13 supported languages
SMS_TEMPLATES: Dict[str, Dict[str, str]] = {
    "TEST_SMS": {
        "en": "AgriFlow: Test SMS verification successful for registered number {phone}. Status: ONLINE.",
        "ta": "AgriFlow: பதிவு செய்யப்பட்ட எண் {phone}-க்கான சோதனை SMS வெற்றி பெற்றது.",
        "hi": "AgriFlow: आपके पंजीकृत नंबर {phone} पर टेस्ट एसएमएस सफलतापूर्वक भेजा गया।",
        "te": "AgriFlow: నమోదు చేసుకున్న నంబర్ {phone}కి టెస్ట్ SMS విజయవంతమైంది.",
        "kn": "AgriFlow: ನೋಂದಾಯಿತ ಸಂಖ್ಯೆ {phone} ಗೆ ಪರೀಕ್ಷಾ SMS ಯಶಸ್ವಿಯಾಗಿದೆ.",
        "ml": "AgriFlow: നിങ്ങളുടെ ഫോൺ നമ്പർ {phone}-ലേക്ക് ടെസ്റ്റ് SMS അയച്ചു.",
        "mr": "AgriFlow: नोंदणीकृत क्रमांक {phone} वर टेस्ट SMS यशस्वी झाला.",
        "bn": "AgriFlow: নিবন্ধিত নম্বর {phone}-এ পরীক্ষা SMS সফল হয়েছে।",
        "gu": "AgriFlow: નોંધાયેલા નંબર {phone} પર ટેસ્ટ SMS સફળ થયો.",
        "pa": "AgriFlow: ਰਜਿਸਟਰਡ ਨੰਬਰ {phone} 'ਤੇ ਟੈਸਟ SMS ਸਫਲ ਰਿਹਾ।",
        "or": "AgriFlow: ଆପଣଙ୍କର ନମ୍ବର {phone} ରେ ପରୀକ୍ଷା SMS ସଫଳ ହେଲା |",
        "as": "AgriFlow: পঞ্জীয়নভুক্ত নম্বৰ {phone} লৈ পৰীক্ষা SMS সফল হ'ল।",
        "ur": "AgriFlow: آپ کے نمبر {phone} پر ٹیسٹ ایس ایم ایس کامیاب رہا۔"
    },
    "REGISTRATION_SUCCESS": {
        "en": "AgriFlow: Registration successful. Your Farmer ID is {farmer_code}. Welcome to AgriFlow Platform.",
        "ta": "AgriFlow: பதிவு வெற்றி. உங்கள் விவசாயி ஐடி: {farmer_code}. AgriFlow தளத்திற்கு நல்வரவு.",
        "hi": "AgriFlow: पंजीकरण सफल हुआ। आपकी किसान आईडी {farmer_code} है। AgriFlow प्लेटफॉर्म में आपका स्वागत है।",
        "te": "AgriFlow: రిజిస్ట్రేషన్ విజయవంతమైంది. మీ రైతు ఐడీ {farmer_code}.",
        "kn": "AgriFlow: ನೋಂದಣಿ ಯಶಸ್ವಿಯಾಗಿದೆ. ನಿಮ್ಮ ರೈತ ಐಡಿ {farmer_code}.",
        "ml": "AgriFlow: രജിസ്ട്രേഷൻ വിജയിച്ചു. നിങ്ങളുടെ കർഷക ഐഡി: {farmer_code}.",
        "mr": "AgriFlow: नोंदणी यशस्वी झाली. तुमचा शेतकरी आयडी {farmer_code} आहे.",
        "bn": "AgriFlow: নিবন্ধন সফল হয়েছে। আপনার কৃষক আইডি {farmer_code}।",
        "gu": "AgriFlow: નોંધણી સફળ થઈ. તમારું ખેડૂત આઈડી {farmer_code} છે.",
        "pa": "AgriFlow: ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਸਫਲ ਰਹੀ। ਤੁਹਾਡੀ ਕਿਸਾਨ ਆਈਡੀ {farmer_code} ਹੈ।",
        "or": "AgriFlow: ପଞ୍ଜୀକରଣ ସଫଳ ହେଲା | ଆପଣଙ୍କର କୃଷକ ID ହେଉଛି {farmer_code} |",
        "as": "AgriFlow: পঞ্জীয়ন সফল হ'ল। আপোনাৰ কৃষক আই ডি {farmer_code}।",
        "ur": "AgriFlow: رجسٹریشن کامیاب رہی۔ آپ کا کسان آئی ڈی {farmer_code} ہے۔"
    },
    "SLOT_BOOKED": {
        "en": "AgriFlow: Your procurement slot is confirmed. Booking ID: {booking_code}. Token: {token_number}. Date: {date}. Amount paid: ₹10.",
        "ta": "AgriFlow: உங்கள் கொள்முதல் முன்பதிவு உறுதி செய்யப்பட்டது. Booking ID: {booking_code}. Token: {token_number}. தேதி: {date}. செலுத்திய தொகை: ₹10.",
        "hi": "AgriFlow: आपका स्लॉट बुक हो गया है। Booking ID: {booking_code}. Token: {token_number}. तिथि: {date}. भुगतान: ₹10।",
        "te": "AgriFlow: మీ స్లాట్ బుకింగ్ పూర్తయింది. Booking ID: {booking_code}. Token: {token_number}. తేదీ: {date}. చెల్లించిన మొత్తం: ₹10.",
        "kn": "AgriFlow: ನಿಮ್ಮ ಸ್ಲಾಟ್ ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ. Booking ID: {booking_code}. Token: {token_number}. ದಿನಾಂಕ: {date}. ಪಾವತించిన ಮೊತ್ತ: ₹10.",
        "ml": "AgriFlow: സ്ലോട്ട് സ്ഥിരീകരിച്ചു. Booking ID: {booking_code}. Token: {token_number}. തീയതി: {date}. തുക: ₹10.",
        "mr": "AgriFlow: तुमचा स्लॉट निश्चित झाला. Booking ID: {booking_code}. Token: {token_number}. तारीख: {date}. रक्कम: ₹10.",
        "bn": "AgriFlow: আপনার স্লট নিশ্চিত করা হয়েছে। Booking ID: {booking_code}. Token: {token_number}. তারিখ: {date}. অর্থ: ₹10।",
        "gu": "AgriFlow: તમારો સ્લોટ કન્ફર્મ થયો. Booking ID: {booking_code}. Token: {token_number}. તારીખ: {date}. ચૂકવણી: ₹10.",
        "pa": "AgriFlow: ਤੁਹਾਡਾ ਸਲਾਟ ਬੁੱਕ ਹੋ ਗਿਆ। Booking ID: {booking_code}. Token: {token_number}. ਤਾਰੀਖ: {date}. ਰਕਮ: ₹10।",
        "or": "AgriFlow: ଆପଣଙ୍କର ସ୍ଲଟ୍ ସୁନିଶ୍ଚିତ ହେଲା | Booking ID: {booking_code}. Token: {token_number}. ତାରିଖ: {date}. ଦେୟ: ₹10 |",
        "as": "AgriFlow: আপোনাৰ স্লট নিশ্চিত হ'ল। Booking ID: {booking_code}. Token: {token_number}. তাৰিখে: {date}. পৰিশোধ: ₹10।",
        "ur": "AgriFlow: آپ کا سلاٹ بک ہو گیا۔ Booking ID: {booking_code}. Token: {token_number}. تاریخ: {date}. رقم: ₹10۔"
    },
    "QUEUE_APPROACHING": {
        "en": "AgriFlow: Your token {token_number} is approaching. {farmers_ahead} farmers ahead. Est wait: {est_wait} mins.",
        "ta": "AgriFlow: உங்கள் டோக்கன் {token_number} விரைவில் வருகிறது. உங்களுக்கு முன் {farmers_ahead} விவசாயிகள் உள்ளனர். காத்திருப்பு நேரம்: {est_wait} நிமிடங்கள்.",
        "hi": "AgriFlow: आपका टोकन {token_number} निकट है। आपके आगे {farmers_ahead} किसान हैं। अनुमानित प्रतीक्षा समय: {est_wait} मिनट।",
        "te": "AgriFlow: మీ టోకెన్ {token_number} వస్తోంది. మీ కంటే ముందు {farmers_ahead} మంది ఉన్నారు.",
        "kn": "AgriFlow: ನಿಮ್ಮ ಟೋಕನ್ {token_number} ಹತ್ತಿರವಾಗುತ್ತಿದೆ. ನಿಮಗಿಂತ ಮುಂಚೆ {farmers_ahead} ರೈತರಿದ್ದಾರೆ.",
        "ml": "AgriFlow: നിങ്ങളുടെ ടോക്കൺ {token_number} അടുക്കുന്നു. മുന്നിൽ {farmers_ahead} പേർ. പ്രതീക്ഷിക്കുന്ന സമയം: {est_wait} മിനിറ്റ്.",
        "mr": "AgriFlow: तुमचा टोकन {token_number} जवळ येत आहे. तुमच्या पुढे {farmers_ahead} शेतकरी आहेत.",
        "bn": "AgriFlow: আপনার টোকেন {token_number} কাছাকাছি আসছে। সামনে {farmers_ahead} জন কৃষক।",
        "gu": "AgriFlow: તમારો ટોકન {token_number} આવી રહ્યો છે. તમારી આગળ {farmers_ahead} ખેડૂતો છે.",
        "pa": "AgriFlow: ਤੁਹਾਡਾ ਟੋਕਨ {token_number} ਨੇੜੇ ਆ ਰਿਹਾ ਹੈ। ਤੁਹਾਡੇ ਤੋਂ ਅੱਗੇ {farmers_ahead} ਕਿਸਾਨ ਹਨ।",
        "or": "AgriFlow: ଆପଣଙ୍କର ଟୋକନ୍ {token_number} ନିକଟତର ହେଉଛି |",
        "as": "AgriFlow: আপোনাৰ টোকেন {token_number} ওচৰ চাপিছে।",
        "ur": "AgriFlow: آپ کا ٹوکن {token_number} قریب آ رہا ہے۔"
    },
    "TOKEN_CALLED": {
        "en": "AgriFlow: Token {token_number} CALLED! Please proceed to Counter #{counter}.",
        "ta": "AgriFlow: டோக்கன் {token_number} அழைக்கப்பட்டது! கவுண்டர் #{counter}-க்கு செல்லவும்.",
        "hi": "AgriFlow: टोकन {token_number} बुलाया गया है! कृपया काउंटर #{counter} पर जाएं।",
        "te": "AgriFlow: టోకెన్ {token_number} పిలవబడింది! దయచేసి కౌంటర్ #{counter}కి వెళ్లండి.",
        "kn": "AgriFlow: ಟೋಕನ್ {token_number} ಕರೆಯಲಾಗಿದೆ! ದಯವಿಟ್ಟು ಕೌಂಟರ್ #{counter} ಗೆ ಹೋಗಿ.",
        "ml": "AgriFlow: ടോക്കൺ {token_number} വിളിച്ചു! കൗണ്ടർ #{counter}-ലേക്ക് പോകുക.",
        "mr": "AgriFlow: टोकन {token_number} बोलावला आहे! कृपया काउंटर #{counter} वर जा.",
        "bn": "AgriFlow: টোকেন {token_number} ডাকা হয়েছে! কাউন্টার #{counter}-এ যান।",
        "gu": "AgriFlow: ટોકન {token_number} બોલાવવામાં આવ્યો! કૃપા કરીને કાઉન્ટર #{counter} પર જાઓ.",
        "pa": "AgriFlow: ਟੋਕਨ {token_number} ਬੁਲਾਇਆ ਗਿਆ! ਕਾਊਂਟਰ #{counter} 'ਤੇ ਜਾਓ।",
        "or": "AgriFlow: ଟୋକନ୍ {token_number} ଡକାଗଲା! କାଉଣ୍ଟର #{counter} କୁ ଯାଆନ୍ତୁ |",
        "as": "AgriFlow: টোকেন {token_number} মতা হৈছে! কাউন্টাৰ #{counter} লৈ যাওক।",
        "ur": "AgriFlow: ٹوکن {token_number} بلا لیا گیا ہے! کاؤنٹر #{counter} پر جائیں۔"
    },
    "PROCUREMENT_COMPLETED": {
        "en": "AgriFlow: Procurement complete for Receipt {receipt_code}. Qty: {quantity} kg, Grade: {grade}, Amount: INR {amount}.",
        "ta": "AgriFlow: ரசீது {receipt_code} கொள்முதல் முடிந்தது. அளவு: {quantity} கிலோ, தொகை: ரூ.{amount}.",
        "hi": "AgriFlow: रसीद {receipt_code} की खरीद पूरी हुई। मात्रा: {quantity} किग्रा, राशि: ₹{amount}।",
        "te": "AgriFlow: కొనుగోలు పూర్తయింది. రశీదు {receipt_code}. పరిమాణం: {quantity} kg, మొత్తం: ₹{amount}.",
        "kn": "AgriFlow: ರಶೀದಿ {receipt_code} ಖರೀದಿ ಪೂರ್ಣಗೊಂಡಿದೆ. ಮೊತ್ತ: ₹{amount}.",
        "ml": "AgriFlow: രസീത് {receipt_code} സംഭരണം പൂർത്തിയായി. തുക: ₹{amount}.",
        "mr": "AgriFlow: पावती {receipt_code} खरेदी पूर्ण झाली. रक्कम: ₹{amount}.",
        "bn": "AgriFlow: রসিদ {receipt_code} সংগ্রহ সম্পন্ন হয়েছে। পরিমাণ: ₹{amount}।",
        "gu": "AgriFlow: રસીદ {receipt_code} ખરીદી પૂર્ણ થઈ. રકમ: ₹{amount}.",
        "pa": "AgriFlow: ਰਸੀਦ {receipt_code} ਖਰੀਦ ਪੂਰੀ ਹੋਈ। ਰਕਮ: ₹{amount}।",
        "or": "AgriFlow: ରସିଦ {receipt_code} ସଂଗ୍ରହ ସମ୍ପୂର୍ଣ୍ଣ ହେଲା | ରାଶି: ₹{amount} |",
        "as": "AgriFlow: ৰছিদ {receipt_code} ক্ৰয় সম্পূৰ্ণ হ'ল। পৰિমাণ: ₹{amount}।",
        "ur": "AgriFlow: رسید {receipt_code} کی خریداری مکمل ہو گئی۔ رقم: ₹{amount}۔"
    },
    "PAYMENT_COMPLETED": {
        "en": "AgriFlow: Payment of INR {amount} COMPLETED. Ref: {payment_ref}. Funds credited to your bank account.",
        "ta": "AgriFlow: ரூ.{amount} பணம் செலுத்துதல் முடிந்தது. குறிப்பு: {payment_ref}.",
        "hi": "AgriFlow: ₹{amount} का भुगतान सफल हुआ। संदर्भ: {payment_ref}।",
        "te": "AgriFlow: ₹{amount} చెల్లింపు పూర్తయింది. రెఫరెన్స్: {payment_ref}.",
        "kn": "AgriFlow: ₹{amount} ಪಾವತಿ ಪೂರ್ಣಗೊಂಡಿದೆ. ಉಲ್ಲೇಖ: {payment_ref}.",
        "ml": "AgriFlow: ₹{amount} പേയ്‌മെന്റ് പൂർത്തിയായി. റഫറൻസ്: {payment_ref}.",
        "mr": "AgriFlow: ₹{amount} चे पेमेंट पूर्ण झाले. संदर्भ: {payment_ref}.",
        "bn": "AgriFlow: ₹{amount} পেমেন্ট সম্পন্ন হয়েছে। রেফারেন্স: {payment_ref}।",
        "gu": "AgriFlow: ₹{amount} ની ચૂકવણી પૂર્ણ થઈ. સંદર્ભ: {payment_ref}.",
        "pa": "AgriFlow: ₹{amount} ਦੀ ਅਦਾਇਗੀ ਪੂਰੀ ਹੋਈ। ਰੈਫਰੈਂਸ: {payment_ref}।",
        "or": "AgriFlow: ₹{amount} ର ଦେୟ ସମ୍ପୂର୍ଣ୍ଣ ହେଲା | ରେଫରେନ୍ସ: {payment_ref} |",
        "as": "AgriFlow: ₹{amount} ର পৰিশোধ সম্পূৰ্ণ হ'ল।",
        "ur": "AgriFlow: ₹{amount} کی ادائیگی مکمل ہو گئی۔ ریفرنس: {payment_ref}۔"
    }
}

def render_sms_message(event_type: str, language: str, context: dict) -> str:
    lang = language.lower() if language else "en"
    templates = SMS_TEMPLATES.get(event_type, SMS_TEMPLATES["REGISTRATION_SUCCESS"])
    template = templates.get(lang, templates.get("en", "AgriFlow Notification"))
    
    try:
        return template.format(**context)
    except Exception:
        return template

def send_sms_notification(
    db: Session,
    user_id: str,
    recipient_phone: str,
    event_type: str,
    language: str,
    context: dict,
    title: str = "AgriFlow Alert"
) -> Dict[str, Any]:
    # 1. Normalize phone to E.164
    try:
        e164_phone = format_and_validate_e164(recipient_phone)
    except ValueError as val_err:
        e164_phone = recipient_phone
        print(f"[SMS WARNING] Invalid E.164 phone: {recipient_phone} - {val_err}")

    masked_phone = mask_phone_number(e164_phone)

    # 2. Render message
    message_text = render_sms_message(event_type, language, context)

    # 3. Create Notification Record in DB
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message_text,
        language=language,
        event_type=event_type,
        is_read=False,
        channel="SMS"
    )
    db.add(notification)
    db.flush()

    provider_id = None
    delivery_status = "QUEUED"
    error_code = None
    error_msg = None
    twilio_success = False

    # 4. Attempt Real Twilio API Call if configured
    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_NUMBER:
        try:
            from twilio.rest import Client
            from twilio.base.exceptions import TwilioRestException

            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            
            kwargs = {
                "body": message_text,
                "from_": settings.TWILIO_PHONE_NUMBER,
                "to": e164_phone
            }
            if settings.TWILIO_STATUS_CALLBACK_URL:
                kwargs["status_callback"] = settings.TWILIO_STATUS_CALLBACK_URL

            message = client.messages.create(**kwargs)
            provider_id = message.sid
            delivery_status = (message.status or "queued").upper()
            twilio_success = True
            safe_print(f"[TWILIO REAL SMS SENT] SID: {provider_id} | Status: {delivery_status} | To: {masked_phone}")

        except TwilioRestException as tre:
            delivery_status = "FAILED"
            error_code = str(tre.code) if hasattr(tre, 'code') else "TWILIO_REST_ERROR"
            error_msg = str(tre.msg) if hasattr(tre, 'msg') else str(tre)
            twilio_success = False
            safe_print(f"[TWILIO API ERROR] Code {error_code} for {masked_phone}: {error_msg}")

        except Exception as exc:
            delivery_status = "FAILED"
            error_code = "UNKNOWN_ERROR"
            error_msg = str(exc)
            twilio_success = False
            safe_print(f"[TWILIO UNEXPECTED ERROR] {masked_phone}: {exc}")
    else:
        # Dev fallback when Twilio credentials are not provided
        provider_id = f"MOCK-SMS-{datetime.datetime.utcnow().timestamp()}"
        delivery_status = "SENT"
        twilio_success = True
        safe_print(f"[SMS DEV SIMULATION] To: {masked_phone} ({language.upper()}) | Event: {event_type}\n    {message_text}")

    # 5. Log Delivery Attempt
    log_entry = NotificationLog(
        notification_id=notification.id,
        user_id=user_id,
        recipient_phone=e164_phone,
        masked_phone_number=masked_phone,
        provider="TWILIO",
        event_type=event_type,
        language=language,
        rendered_message=message_text,
        provider_message_id=provider_id,
        delivery_status=delivery_status,
        error_code=error_code,
        error_message=error_msg
    )
    db.add(log_entry)
    db.commit()

    return {
        "success": twilio_success,
        "notification_id": notification.id,
        "message_sid": provider_id,
        "status": delivery_status,
        "recipient_phone_masked": masked_phone,
        "rendered_message": message_text,
        "error_code": error_code,
        "error": error_msg
    }
