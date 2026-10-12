/**
 * Form Validation and Agricultural Calculation Utilities
 */

/**
 * Validates whether an email string follows standard email formatting.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates and normalizes an Indian mobile phone number to E.164 (+91XXXXXXXXXX).
 * Accepts 10 digits (6-9 prefix), +91 prefix, or 0 prefix.
 */
export function validateIndianPhoneNumber(phone: string): { isValid: boolean; formatted: string; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, formatted: '', error: 'Mobile phone number is required.' };
  }

  const cleaned = phone.replace(/[\s\-\(\)]/g, '').trim();

  // If already starts with +91
  if (/^\+91[6-9]\d{9}$/.test(cleaned)) {
    return { isValid: true, formatted: cleaned };
  }

  // If starts with 91 followed by 10 digits
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return { isValid: true, formatted: `+${cleaned}` };
  }

  // If starts with leading 0 (STD prefix)
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return { isValid: true, formatted: `+91${cleaned.slice(1)}` };
  }

  // If plain 10 digits starting with 6, 7, 8, 9
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return { isValid: true, formatted: `+91${cleaned}` };
  }

  return {
    isValid: false,
    formatted: '',
    error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
  };
}

/**
 * Masks phone numbers for secure UI display (e.g., +919876543210 -> +91******3210).
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (trimmed.length <= 6) return '****';

  const prefix = trimmed.startsWith('+') ? trimmed.slice(0, 3) : trimmed.slice(0, 2);
  const suffix = trimmed.slice(-4);
  const maskLength = Math.max(trimmed.length - prefix.length - suffix.length, 4);
  return `${prefix}${'*'.repeat(maskLength)}${suffix}`;
}

/**
 * Validates that an agricultural land area in acres is within valid physical limits.
 */
export function validateLandAreaAcres(acres: number): { isValid: boolean; error?: string } {
  if (isNaN(acres) || acres <= 0) {
    return { isValid: false, error: 'Land area must be greater than 0 acres.' };
  }
  if (acres > 10000) {
    return { isValid: false, error: 'Land area exceeds maximum allowable limit of 10,000 acres.' };
  }
  return { isValid: true };
}

/**
 * Validates expected crop harvest quantity in kilograms.
 */
export function validateCropQuantityKg(quantity: number): { isValid: boolean; error?: string } {
  if (isNaN(quantity) || quantity <= 0) {
    return { isValid: false, error: 'Expected harvest quantity must be greater than 0 kg.' };
  }
  if (quantity > 500000) {
    return { isValid: false, error: 'Quantity exceeds maximum single procurement capacity of 500,000 kg.' };
  }
  return { isValid: true };
}

/**
 * Enforces the standardized AgriFlow booking fee calculation.
 * Fixed platform fee of ₹10 (1000 paise).
 */
export const BOOKING_FEE_INR = 10.0;
export const BOOKING_FEE_PAISE = 1000;

export function calculateBookingFee(): { amountInr: number; amountPaise: number } {
  return {
    amountInr: BOOKING_FEE_INR,
    amountPaise: BOOKING_FEE_PAISE,
  };
}
