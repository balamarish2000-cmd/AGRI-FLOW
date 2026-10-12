import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { OfflineBanner } from '../components/OfflineBanner';
import { LanguageSelector } from '../components/LanguageSelector';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { LanguageProvider } from '../contexts/LanguageContext';
import * as AuthContextModule from '../contexts/AuthContext';

describe('OfflineBanner Component', () => {
  it('renders nothing when navigator is online', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders offline warning when offline event is triggered', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    render(<OfflineBanner />);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByText(/Low\/No Connection Mode/i)).toBeInTheDocument();
  });

  it('hides offline warning when online event is restored', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    const { container } = render(<OfflineBanner />);

    expect(screen.getByText(/Low\/No Connection Mode/i)).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(container.querySelector('.animate-pulse')).toBeNull();
  });
});

describe('LanguageSelector Component', () => {
  it('renders language selector with supported languages', () => {
    render(
      <LanguageProvider>
        <LanguageSelector />
      </LanguageProvider>
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.options.length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText(/English/i)).toBeInTheDocument();
    expect(screen.getByText(/हिन्दी/i)).toBeInTheDocument();
  });

  it('updates language when selected by user', () => {
    render(
      <LanguageProvider>
        <LanguageSelector />
      </LanguageProvider>
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'hi' } });
    expect(select.value).toBe('hi');
  });
});

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading spinner when auth is loading', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isLoading: true,
      loginToken: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['FARMER']} />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Authenticating session/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated user to /farmer/login', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isLoading: false,
      loginToken: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/farmer/login" element={<div>Farmer Login Screen</div>} />
          <Route element={<ProtectedRoute allowedRoles={['FARMER']} />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Farmer Login Screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects unauthorized role to their respective dashboard', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'u1',
        email: 'officer@agriflow.gov',
        role: 'PROCUREMENT_OFFICER',
        full_name: 'Officer John',
        phone: '+919876543210',
        preferred_language: 'en',
        is_active: true,
        created_at: '2026-10-12T00:00:00Z',
      },
      token: 'jwt-officer-token',
      isLoading: false,
      loginToken: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/farmer-only']}>
        <Routes>
          <Route path="/officer/dashboard" element={<div>Officer Dashboard Screen</div>} />
          <Route element={<ProtectedRoute allowedRoles={['FARMER']} />}>
            <Route path="/farmer-only" element={<div>Farmer Only Screen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Officer Dashboard Screen')).toBeInTheDocument();
    expect(screen.queryByText('Farmer Only Screen')).not.toBeInTheDocument();
  });

  it('renders child route content when user has allowed role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'f1',
        email: 'farmer@agriflow.gov',
        role: 'FARMER',
        full_name: 'Farmer Ramesh',
        phone: '+919876543210',
        preferred_language: 'hi',
        is_active: true,
        created_at: '2026-10-12T00:00:00Z',
      },
      token: 'jwt-farmer-token',
      isLoading: false,
      loginToken: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/farmer/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['FARMER']} />}>
            <Route path="/farmer/dashboard" element={<div>Welcome Ramesh Farmer Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Welcome Ramesh Farmer Dashboard')).toBeInTheDocument();
  });
});
