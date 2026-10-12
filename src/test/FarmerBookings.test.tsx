import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FarmerBookings } from '../pages/farmer/FarmerBookings';
import * as ApiModule from '../services/api';

describe('FarmerBookings Component (Loading, Empty, Success & Error States)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially while fetching bookings', () => {
    // Hang promise to verify loading state
    vi.spyOn(ApiModule, 'apiRequest').mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <FarmerBookings />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading booking history\.\.\./i)).toBeInTheDocument();
  });

  it('renders empty state when no bookings exist', async () => {
    vi.spyOn(ApiModule, 'apiRequest').mockResolvedValue([]);

    render(
      <MemoryRouter>
        <FarmerBookings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No active or historical bookings found\./i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Book Your First Slot/i)).toBeInTheDocument();
  });

  it('renders list of bookings with codes, token and ₹10 payment badge', async () => {
    const mockBookings = [
      {
        id: 'b-001',
        booking_code: 'BK-20261012-001',
        farmer_id: 'farm-1',
        slot_id: 'slot-1',
        crop_id: 'crop-1',
        expected_quantity_kg: 5000,
        status: 'BOOKED',
        created_at: '2026-10-12T08:00:00Z',
        queue_token: {
          token_number: 'A01',
          position: 1,
          state: 'BOOKED',
        },
      },
      {
        id: 'b-002',
        booking_code: 'BK-20261012-002',
        farmer_id: 'farm-1',
        slot_id: 'slot-2',
        crop_id: 'crop-2',
        expected_quantity_kg: 12500,
        status: 'COMPLETED',
        created_at: '2026-10-11T09:30:00Z',
        queue_token: {
          token_number: 'B04',
          position: 4,
          state: 'COMPLETED',
        },
      },
    ];

    vi.spyOn(ApiModule, 'apiRequest').mockResolvedValue(mockBookings);

    render(
      <MemoryRouter>
        <FarmerBookings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('BK-20261012-001')).toBeInTheDocument();
    });

    expect(screen.getByText(/5,000 kg Crop Yield/i)).toBeInTheDocument();
    expect(screen.getByText(/Token: A01/i)).toBeInTheDocument();
    expect(screen.getByText('BK-20261012-002')).toBeInTheDocument();
    expect(screen.getByText(/12,500 kg Crop Yield/i)).toBeInTheDocument();
    expect(screen.getAllByText(/₹10 Paid/i).length).toBe(2);
  });

  it('handles API error without crashing and shows empty state', async () => {
    vi.spyOn(ApiModule, 'apiRequest').mockRejectedValue(new Error('Network offline'));

    render(
      <MemoryRouter>
        <FarmerBookings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading booking history/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/No active or historical bookings found\./i)).toBeInTheDocument();
  });
});
