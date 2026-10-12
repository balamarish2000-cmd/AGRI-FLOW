import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  validateIndianPhoneNumber,
  maskPhoneNumber,
  validateLandAreaAcres,
  validateCropQuantityKg,
  calculateBookingFee,
  BOOKING_FEE_INR,
  BOOKING_FEE_PAISE,
} from '../utils/validation';

describe('Form Validation & Agricultural Utilities', () => {
  describe('Email Validation (isValidEmail)', () => {
    it('accepts standard valid email addresses', () => {
      expect(isValidEmail('farmer.selvam@gmail.com')).toBe(true);
      expect(isValidEmail('admin@agriflow.gov.in')).toBe(true);
      expect(isValidEmail('officer.coimbatore@agriflow.org')).toBe(true);
    });

    it('rejects invalid email formats', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('plainaddress')).toBe(false);
      expect(isValidEmail('@missinguser.com')).toBe(false);
      expect(isValidEmail('missingdomain@')).toBe(false);
      expect(isValidEmail('missingdot@domain')).toBe(false);
      expect(isValidEmail('spaces in@address.com')).toBe(false);
    });
  });

  describe('Indian Phone Number Validation (validateIndianPhoneNumber)', () => {
    it('normalizes standard 10-digit Indian numbers to E.164 (+91)', () => {
      const res = validateIndianPhoneNumber('9876543210');
      expect(res.isValid).toBe(true);
      expect(res.formatted).toBe('+919876543210');
    });

    it('accepts numbers already in E.164 format (+91XXXXXXXXXX)', () => {
      const res = validateIndianPhoneNumber('+919876543210');
      expect(res.isValid).toBe(true);
      expect(res.formatted).toBe('+919876543210');
    });

    it('handles numbers with hyphens, spaces, and brackets', () => {
      const res = validateIndianPhoneNumber('+91 98765-43210');
      expect(res.isValid).toBe(true);
      expect(res.formatted).toBe('+919876543210');
    });

    it('handles numbers with leading 0', () => {
      const res = validateIndianPhoneNumber('09876543210');
      expect(res.isValid).toBe(true);
      expect(res.formatted).toBe('+919876543210');
    });

    it('rejects numbers starting with invalid digits (e.g. 1, 2, 3, 4, 5)', () => {
      const res = validateIndianPhoneNumber('1234567890');
      expect(res.isValid).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('rejects numbers that are too short or too long', () => {
      expect(validateIndianPhoneNumber('98765').isValid).toBe(false);
      expect(validateIndianPhoneNumber('98765432109999').isValid).toBe(false);
      expect(validateIndianPhoneNumber('').isValid).toBe(false);
    });
  });

  describe('Phone Masking Utility (maskPhoneNumber)', () => {
    it('correctly masks mobile numbers for privacy', () => {
      expect(maskPhoneNumber('+919876543210')).toBe('+91******3210');
      expect(maskPhoneNumber('+919025253294')).toBe('+91******3294');
    });

    it('handles edge cases safely', () => {
      expect(maskPhoneNumber('')).toBe('');
      expect(maskPhoneNumber('123')).toBe('****');
    });
  });

  describe('Land Area Boundary Checks (validateLandAreaAcres)', () => {
    it('accepts positive land area measurements', () => {
      expect(validateLandAreaAcres(0.5).isValid).toBe(true);
      expect(validateLandAreaAcres(4.5).isValid).toBe(true);
      expect(validateLandAreaAcres(100).isValid).toBe(true);
    });

    it('rejects zero or negative land areas', () => {
      expect(validateLandAreaAcres(0).isValid).toBe(false);
      expect(validateLandAreaAcres(-2.5).isValid).toBe(false);
    });

    it('rejects unrealistic land areas exceeding boundary limits', () => {
      expect(validateLandAreaAcres(10001).isValid).toBe(false);
    });
  });

  describe('Crop Quantity Boundary Checks (validateCropQuantityKg)', () => {
    it('accepts valid harvest quantities', () => {
      expect(validateCropQuantityKg(500).isValid).toBe(true);
      expect(validateCropQuantityKg(2500.0).isValid).toBe(true);
    });

    it('rejects non-positive crop quantities', () => {
      expect(validateCropQuantityKg(0).isValid).toBe(false);
      expect(validateCropQuantityKg(-100).isValid).toBe(false);
    });

    it('rejects quantities exceeding centre procurement capacity limit', () => {
      expect(validateCropQuantityKg(500001).isValid).toBe(false);
    });
  });

  describe('Booking Fee Enforced Rules', () => {
    it('strictly enforces ₹10 booking fee (1000 paise)', () => {
      const fee = calculateBookingFee();
      expect(fee.amountInr).toBe(10.0);
      expect(fee.amountPaise).toBe(1000);
      expect(BOOKING_FEE_INR).toBe(10.0);
      expect(BOOKING_FEE_PAISE).toBe(1000);
    });
  });
});
