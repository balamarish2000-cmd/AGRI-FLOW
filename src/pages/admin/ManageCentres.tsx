import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { ProcurementCentre } from '../../types';
import { Building2, Plus, MapPin, Check } from 'lucide-react';

export const ManageCentres: React.FC = () => {
  const [centres, setCentres] = useState<ProcurementCentre[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    code: 'PC-TN-MAD-01',
    name: 'Madurai Grain Procurement Yard',
    address: '45 APMC Road, Mattuthavani',
    district: 'Madurai',
    state: 'Tamil Nadu',
    daily_capacity_kg: '50000',
    active_counters: '4'
  });

  const loadCentres = async () => {
    try {
      const list = await apiRequest<ProcurementCentre[]>('/centres');
      setCentres(list);
    } catch (err) {
      console.error('Failed to load centres:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCentres();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/centres', 'POST', {
        ...formData,
        daily_capacity_kg: parseFloat(formData.daily_capacity_kg),
        active_counters: parseInt(formData.active_counters, 10)
      });
      setShowModal(false);
      loadCentres();
    } catch (err: any) {
      alert(err.message || 'Failed to create centre');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="glass-card p-6 rounded-2xl border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">SYSTEM CONFIGURATION</span>
          <h1 className="text-2xl font-display font-extrabold text-white mt-1">Procurement Centres</h1>
          <p className="text-xs text-slate-400 mt-1">Configure daily capacities, location coordinates, & counters</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Procurement Centre</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {centres.map((c) => (
          <div key={c.id} className="glass-card p-6 rounded-2xl border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400">{c.code}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                ACTIVE
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">{c.name}</h3>
            <p className="text-xs text-slate-400 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{c.address}, {c.district}, {c.state}</span>
            </p>

            <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block">Daily Capacity</span>
                <span className="font-bold text-slate-200">{c.daily_capacity_kg.toLocaleString()} kg</span>
              </div>
              <div>
                <span className="text-slate-500 block">Counters</span>
                <span className="font-bold text-slate-200">{c.active_counters} Active</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 border border-amber-500/30 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Add Procurement Centre</h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Code</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Centre Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">District</label>
                <input
                  type="text"
                  required
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  Create Centre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
