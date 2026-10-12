import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiRequest } from '../../services/api';
import { Booking, QueueToken } from '../../types';
import { Clock, Calendar, Users, ArrowRight, Navigation, CheckCircle2 } from 'lucide-react';

export const FarmerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const bookings = await apiRequest<Booking[]>('/bookings/my-bookings');
        if (bookings && bookings.length > 0) {
          const active = bookings.find(b => ['BOOKED', 'ARRIVED', 'WAITING', 'CALLED', 'PROCESSING'].includes(b.status)) || bookings[0];
          setActiveBooking(active);
        }
      } catch (err) {
        console.error('Failed to load farmer bookings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const token: QueueToken | undefined = activeBooking?.queue_token;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 rounded-2xl border-emerald-200 bg-white shadow-xs">
        <div>
          <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase">FARMER PORTAL</span>
          <h1 className="text-2xl font-display font-extrabold text-slate-900 mt-1">
            {t('farmer.welcome')} {user?.full_name}!
          </h1>
          <p className="text-xs text-slate-500 mt-1">Track your active token, queue position, and procurement progress.</p>
        </div>
        <Link
          to="/farmer/book-slot"
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-extrabold py-3 px-5 rounded-xl shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto"
        >
          <Calendar className="w-4 h-4" />
          <span>{t('nav.bookSlot')} (₹10)</span>
        </Link>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center rounded-2xl bg-white text-xs text-slate-500">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-medium">Fetching real-time queue token status...</p>
        </div>
      ) : activeBooking && token ? (
        <div className="space-y-6">
          {/* Active Token Card */}
          <div className="glass-card p-6 sm:p-8 rounded-2xl border-2 border-emerald-200 bg-white relative overflow-hidden shadow-md">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Booking Code</span>
                <p className="text-sm font-mono font-bold text-emerald-700">{activeBooking.booking_code}</p>
              </div>
              <span className={`px-3.5 py-1 rounded-full text-xs font-extrabold tracking-wider ${
                token.state === 'CALLED' ? 'bg-emerald-600 text-white animate-pulse' :
                token.state === 'PROCESSING' ? 'bg-blue-600 text-white' :
                'bg-emerald-50 text-emerald-800 border border-emerald-300'
              }`}>
                {token.state}
              </span>
            </div>

            {/* "DON'T COME YET" Banner */}
            {token.dont_come_yet && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                <div className="flex items-center space-x-2">
                  <Navigation className="w-5 h-5 text-amber-600 shrink-0" />
                  <h4 className="text-sm font-bold text-amber-900">{t('farmer.dontComeYet')}</h4>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">{t('farmer.dontComeMessage')}</p>
                {token.recommended_departure_time && (
                  <div className="pt-2 border-t border-amber-200 text-xs font-semibold">
                    <span>{t('farmer.recommendedDeparture')}: </span>
                    <span className="text-amber-800 font-extrabold">{token.recommended_departure_time}</span>
                  </div>
                )}
              </div>
            )}

            {/* Token Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                  {t('farmer.token')}
                </span>
                <span className="text-3xl sm:text-4xl font-display font-black text-emerald-700 tracking-tight">
                  {token.token_number}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  {t('farmer.currentToken')}
                </span>
                <span className="text-3xl sm:text-4xl font-display font-black text-slate-800 tracking-tight">
                  A35
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  {t('farmer.farmersAhead')}
                </span>
                <span className="text-3xl sm:text-4xl font-display font-black text-amber-600 tracking-tight">
                  {token.farmers_ahead}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  {t('farmer.estimatedWait')}
                </span>
                <span className="text-2xl sm:text-3xl font-display font-black text-teal-700 tracking-tight">
                  {token.estimated_wait_mins}m
                </span>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link
                to={`/farmer/live-queue/${token.centre_id}`}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-8 rounded-xl shadow-md shadow-emerald-600/20 transition-all text-xs"
              >
                <span>{t('farmer.viewQueue')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center rounded-2xl border-slate-200 bg-white shadow-xs">
          <Calendar className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Active Queue Token</h3>
          <p className="text-xs text-slate-500 mb-6">Book a procurement slot and pay the ₹10 fee to generate your queue token.</p>
          <Link
            to="/farmer/book-slot"
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-md shadow-emerald-600/20 transition-all text-xs"
          >
            <span>Book Slot (₹10)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
};
