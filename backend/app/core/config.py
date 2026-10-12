import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AGRIFLOW Platform"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    DATABASE_URL: str = "sqlite:///./agriflow.db"

    JWT_SECRET: str = "agriflow_production_secret_key_change_in_prod_2026_super_secure"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days

    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    TWILIO_STATUS_CALLBACK_URL: str = ""

    # Razorpay Payment Gateway Configuration
    RAZORPAY_KEY_ID: str = "rzp_test_agriflow_sample_key_id"
    RAZORPAY_KEY_SECRET: str = "agriflow_razorpay_secret_key"
    RAZORPAY_MODE: str = "test"  # test or live

    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    GOOGLE_MAPS_API_KEY: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
