export type Role = 'FARMER' | 'PROCUREMENT_OFFICER' | 'ADMIN';

export type QueueState = 
  | 'BOOKED'
  | 'ARRIVED'
  | 'WAITING'
  | 'CALLED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: Role;
  preferred_language: string;
  is_active: boolean;
  created_at: string;
}

export interface Crop {
  id: string;
  farm_id: string;
  crop_name: string;
  variety: string;
  expected_quantity_kg: number;
  harvest_period: string;
  status: string;
  created_at: string;
}

export interface Farm {
  id: string;
  farmer_id: string;
  farm_name: string;
  location_address: string;
  district: string;
  land_area_acres: number;
  crops: Crop[];
  created_at: string;
}

export interface FarmerProfile {
  id: string;
  user_id: string;
  farmer_code: string;
  address: string;
  village: string;
  district: string;
  state: string;
  ifsc_code?: string;
  user: User;
  farms: Farm[];
  created_at: string;
}

export interface ProcurementCentre {
  id: string;
  code: string;
  name: string;
  address: string;
  district: string;
  state: string;
  daily_capacity_kg: number;
  active_counters: number;
  avg_processing_mins_per_farmer: number;
  is_active: boolean;
  created_at: string;
}

export interface Slot {
  id: string;
  centre_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  max_capacity_kg: number;
  booked_capacity_kg: number;
  max_farmers: number;
  booked_farmers: number;
  is_available: boolean;
}

export interface QueueToken {
  id: string;
  token_number: string;
  booking_id: string;
  centre_id: string;
  token_date: string;
  position: number;
  state: QueueState;
  counter_assigned?: number;
  arrival_time?: string;
  called_time?: string;
  processing_start_time?: string;
  completed_time?: string;
  estimated_wait_mins: number;
  farmers_ahead: number;
  recommended_departure_time?: string;
  dont_come_yet: boolean;
}

export interface Booking {
  id: string;
  booking_code: string;
  farmer_id: string;
  slot_id: string;
  crop_id: string;
  expected_quantity_kg: number;
  status: QueueState;
  queue_token?: QueueToken;
  created_at: string;
}

export interface Procurement {
  id: string;
  receipt_code: string;
  token_id: string;
  booking_id: string;
  officer_id: string;
  actual_quantity_kg: number;
  quality_grade: string;
  moisture_content_pct: number;
  unit_price_inr: number;
  total_amount_inr: number;
  status: string;
  remarks?: string;
  completed_at: string;
}

export interface Payment {
  id: string;
  payment_ref: string;
  procurement_id: string;
  farmer_id: string;
  amount_inr: number;
  payment_status: PaymentStatus;
  bank_ref_number?: string;
  failure_reason?: string;
  processed_at?: string;
  created_at: string;
}

export interface NotificationLogItem {
  id: string;
  notification_id?: string;
  recipient_phone: string;
  masked_phone_number?: string;
  provider: string;
  event_type: string;
  language: string;
  rendered_message: string;
  provider_message_id?: string;
  delivery_status: string;
  error_code?: string;
  error_message?: string;
  sent_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  language: string;
  event_type: string;
  is_read: boolean;
  channel: string;
  created_at: string;
  logs?: NotificationLogItem[];
}

export interface TestSMSResult {
  success: boolean;
  message_sid?: string;
  status: string;
  recipient_phone_masked: string;
  rendered_message: string;
  error_code?: string;
  error?: string;
}

export interface SMSRetryResult {
  success: boolean;
  notification_id: string;
  message_sid?: string;
  status: string;
  recipient_phone_masked: string;
  error_code?: string;
  error?: string;
}

export interface AdminAnalytics {
  total_farmers: number;
  active_centres: number;
  todays_bookings: number;
  completed_procurements: number;
  pending_payments_count: number;
  pending_payments_value: number;
  average_waiting_time_mins: number;
  centre_congestion_percentage: number;
}
