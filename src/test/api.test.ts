import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest, ApiError } from '../services/api';

describe('Unified apiRequest Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('performs a successful GET request and parses response JSON', async () => {
    const mockData = [{ id: 'pc-1', name: 'Coimbatore Hub' }];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    });

    const result = await apiRequest('/centres');

    expect(result).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/centres'),
      expect.objectContaining({
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('injects Bearer token into Authorization header when present in localStorage', async () => {
    localStorage.setItem('agriflow_token', 'mock_jwt_token_123');

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success' }),
    });

    await apiRequest('/farmer/profile');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/farmer/profile'),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock_jwt_token_123',
        },
      })
    );
  });

  it('allows overriding token using customToken parameter', async () => {
    localStorage.setItem('agriflow_token', 'default_token');

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: 'admin' }),
    });

    await apiRequest('/admin/audit-logs', 'GET', undefined, 'custom_admin_token');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/admin/audit-logs'),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer custom_admin_token',
        },
      })
    );
  });

  it('handles 400 Bad Request and extracts detail message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Centre code already exists' }),
    });

    await expect(apiRequest('/centres', 'POST', { code: 'PC-1' })).rejects.toThrow(ApiError);

    try {
      await apiRequest('/centres', 'POST', { code: 'PC-1' });
    } catch (err: any) {
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe('Centre code already exists');
    }
  });

  it('cleans up stored session tokens upon receiving 401 Unauthorized', async () => {
    localStorage.setItem('agriflow_token', 'expired_token');
    localStorage.setItem('agriflow_user', '{"id":"user-1"}');

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Token expired' }),
    });

    try {
      await apiRequest('/farmer/bookings');
    } catch (err: any) {
      expect(err.statusCode).toBe(401);
      expect(localStorage.getItem('agriflow_token')).toBeNull();
      expect(localStorage.getItem('agriflow_user')).toBeNull();
    }
  });

  it('formats FastAPI validation error array into a readable message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        detail: [
          { loc: ['body', 'phone'], msg: 'Invalid phone format' },
          { loc: ['body', 'email'], msg: 'value is not a valid email address' },
        ],
      }),
    });

    try {
      await apiRequest('/auth/farmer/register', 'POST', {});
    } catch (err: any) {
      expect(err.statusCode).toBe(422);
      expect(err.errorCode).toBe('VALIDATION_ERROR');
      expect(err.message).toContain('phone: Invalid phone format');
      expect(err.message).toContain('email: value is not a valid email address');
    }
  });

  it('handles network connection dropouts gracefully as NETWORK_UNAVAILABLE', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    try {
      await apiRequest('/centres');
      expect.unreachable('Should have thrown an ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(0);
      expect(err.errorCode).toBe('NETWORK_UNAVAILABLE');
      expect(err.message).toContain('Network connection unavailable');
    }
  });
});
