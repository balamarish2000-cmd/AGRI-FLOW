import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import { Booking } from '../../types';
import { Bookmark, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';

export const FarmerBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const list = await apiRequest<Booking[]>('/bookings/my-bookings');
        setBookings(list);
      } catch (err) {
        console.error('Failed to load farmer bookings:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="glass-card p-6 rounded-2xl border-emerald-200 bg-white shadow-sm">
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">BOOKING HISTORY</span>
        <h1 className="text-2xl font-display font-extrabold text-slate-900 mt-1">My Procurement Bookings</h1>
        <p className="text-xs text-slate-500 mt-1">Complete record of your reserved slots, tokens, and ₹10 payment confirmations</p>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-xs text-slate-500 bg-white">Loading booking history...</div>
      ) : bookings.length === 0 ? (
        <div className="glass-card p-12 text-center text-xs text-slate-500 rounded-2xl bg-white">
          <Bookmark className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No active or historical bookings found.</p>
          <Link
            to="/farmer/book-slot"
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs mt-4 transition-colors"
          >
            <span>Book Your First Slot</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b.id} className="glass-card p-6 rounded-2xl border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-emerald-300 transition-colors">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">{b.booking_code}</span>
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    Token: {b.queue_token?.token_number || 'A01'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-2">{b.expected_quantity_kg.toLocaleString()} kg Crop Yield</h3>
                <span className="text-xs text-slate-500 block mt-1">
                  Booked on: {new Date(b.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>₹10 Paid</span>
                </span>
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  ['BOOKED', 'ARRIVED', 'WAITING'].includes(b.status) ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                  b.status === 'COMPLETED' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-600 text-white'
                }`}>
                  {b.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
