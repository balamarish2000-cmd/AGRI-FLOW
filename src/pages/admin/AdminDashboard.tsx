import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import { AdminAnalytics } from '../../types';
import { Users, Building2, Calendar, FileCheck, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest<AdminAnalytics>('/admin/analytics');
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to load admin analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const chartData = [
    { day: 'Mon', bookings: 45, volume: 85 },
    { day: 'Tue', bookings: 62, volume: 110 },
    { day: 'Wed', bookings: 78, volume: 145 },
    { day: 'Thu', bookings: 90, volume: 160 },
    { day: 'Fri', bookings: 84, volume: 150 },
    { day: 'Sat', bookings: 55, volume: 95 },
    { day: 'Sun', bookings: 30, volume: 50 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-6 rounded-2xl border-emerald-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">CENTRAL SYSTEM ADMINISTRATION</span>
          <h1 className="text-2xl font-display font-extrabold text-slate-900 mt-1">AgriFlow System Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">Real database metric tracking across all procurement centers</p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/admin/centres"
            className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
          >
            Manage Centres
          </Link>
          <Link
            to="/admin/audit-logs"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
          >
            Audit Logs
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-xs text-slate-500 bg-white">Loading system metrics...</div>
      ) : analytics ? (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">Registered Farmers</span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-3xl font-display font-black text-slate-900">{analytics.total_farmers}</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">Active Centres</span>
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-3xl font-display font-black text-slate-900">{analytics.active_centres}</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">Today's Bookings</span>
                <Calendar className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-3xl font-display font-black text-slate-900">{analytics.todays_bookings}</span>
            </div>

            <div className="glass-card p-5 rounded-2xl border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">Total Procurements</span>
                <FileCheck className="w-4 h-4 text-teal-600" />
              </div>
              <span className="text-3xl font-display font-black text-slate-900">{analytics.completed_procurements}</span>
            </div>
          </div>

          {/* Analytics Chart */}
          <div className="glass-card p-6 rounded-2xl border-slate-200 bg-white shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Weekly Procurement Volume & Booking Trends</span>
            </h3>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', color: '#0f172a' }} />
                  <Bar dataKey="bookings" fill="#16a34a" name="Bookings" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="volume" fill="#2563eb" name="Volume (Tons)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
