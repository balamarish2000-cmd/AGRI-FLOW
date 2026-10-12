import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { Sprout, LogOut, Calendar, Clock, CreditCard, FileCheck, Bell, Bookmark } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isFarmer = user?.role === 'FARMER';
  const isOfficer = user?.role === 'PROCUREMENT_OFFICER';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-display font-extrabold text-xl tracking-tight text-slate-900">
                AGRIFLOW
              </span>
              <span className="block text-[10px] font-bold text-emerald-700 tracking-wider uppercase">
                Smart Procurement
              </span>
            </div>
          </Link>

          {/* Navigation Links for Farmers */}
          {isFarmer && (
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                to="/farmer/dashboard"
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 ${
                  location.pathname === '/farmer/dashboard'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>{t('nav.dashboard')}</span>
              </Link>
              <Link
                to="/farmer/book-slot"
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 ${
                  location.pathname === '/farmer/book-slot'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>{t('nav.bookSlot')}</span>
              </Link>
              <Link
                to="/farmer/bookings"
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 ${
                  location.pathname === '/farmer/bookings'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Bookmark className="w-4 h-4 text-emerald-600" />
                <span>My Bookings</span>
              </Link>
              <Link
                to="/farmer/procurements"
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 ${
                  location.pathname === '/farmer/procurements'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>{t('nav.procurements')}</span>
              </Link>
              <Link
                to="/farmer/payments"
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 ${
                  location.pathname === '/farmer/payments'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>{t('nav.payments')}</span>
              </Link>
              <Link
                to="/farmer/notifications"
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 ${
                  location.pathname === '/farmer/notifications'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Bell className="w-4 h-4 text-emerald-600" />
                <span>{t('nav.notifications')}</span>
              </Link>
            </nav>
          )}

          {/* Right Section */}
          <div className="flex items-center space-x-3">
            <LanguageSelector />

            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800">{user.full_name}</span>
                  <span className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/farmer/login"
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                >
                  Farmer Portal
                </Link>
                <Link
                  to="/officer/login"
                  className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Officer
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
