import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Navbar } from './components/Navbar';
import { OfflineBanner } from './components/OfflineBanner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

// Auth Pages
import { FarmerLogin } from './pages/auth/FarmerLogin';
import { FarmerRegister } from './pages/auth/FarmerRegister';
import { OfficerLogin } from './pages/auth/OfficerLogin';
import { AdminLogin } from './pages/auth/AdminLogin';

// Farmer Pages
import { FarmerDashboard } from './pages/farmer/FarmerDashboard';
import { BookSlot } from './pages/farmer/BookSlot';
import { FarmerBookings } from './pages/farmer/FarmerBookings';
import { LiveQueue } from './pages/farmer/LiveQueue';
import { FarmerProcurements } from './pages/farmer/FarmerProcurements';
import { FarmerPayments } from './pages/farmer/FarmerPayments';
import { NotificationCenter } from './pages/farmer/NotificationCenter';

// Officer & Admin Pages
import { OfficerDashboard } from './pages/officer/OfficerDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ManageCentres } from './pages/admin/ManageCentres';
import { AuditLogs } from './pages/admin/AuditLogs';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
          <OfflineBanner />
          <Navbar />
          <main className="flex-1 pb-16">
            <ErrorBoundary>
              <Routes>
                {/* Public & Separate Authentication Routes */}
                <Route path="/" element={<Navigate to="/farmer/login" replace />} />
                <Route path="/farmer/login" element={<FarmerLogin />} />
                <Route path="/farmer/register" element={<FarmerRegister />} />
                <Route path="/officer/login" element={<OfficerLogin />} />
                <Route path="/admin/login" element={<AdminLogin />} />

                {/* Farmer Protected Routes */}
                <Route element={<ProtectedRoute allowedRoles={['FARMER', 'ADMIN']} />}>
                  <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
                  <Route path="/farmer/book-slot" element={<BookSlot />} />
                  <Route path="/farmer/bookings" element={<FarmerBookings />} />
                  <Route path="/farmer/live-queue/:centre_id" element={<LiveQueue />} />
                  <Route path="/farmer/procurements" element={<FarmerProcurements />} />
                  <Route path="/farmer/payments" element={<FarmerPayments />} />
                  <Route path="/farmer/notifications" element={<NotificationCenter />} />
                </Route>

                {/* Officer Protected Routes */}
                <Route element={<ProtectedRoute allowedRoles={['PROCUREMENT_OFFICER', 'ADMIN']} />}>
                  <Route path="/officer/dashboard" element={<OfficerDashboard />} />
                </Route>

                {/* Admin Protected Routes */}
                <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/centres" element={<ManageCentres />} />
                  <Route path="/admin/audit-logs" element={<AuditLogs />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </LanguageProvider>
    </AuthProvider>
  );
};
