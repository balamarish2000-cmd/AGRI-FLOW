import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { Procurement } from '../../types';
import { FileCheck } from 'lucide-react';

export const FarmerProcurements: React.FC = () => {
  const [procurements, setProcurements] = useState<Procurement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const list = await apiRequest<Procurement[]>('/procurements/my-procurements');
        setProcurements(list);
      } catch (err) {
        console.error('Failed to load procurements:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="glass-card p-6 rounded-2xl border-emerald-200 bg-white shadow-xs">
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">PROCUREMENT RECEIPTS</span>
        <h1 className="text-2xl font-display font-extrabold text-slate-900 mt-1">My Procurement Receipts</h1>
        <p className="text-xs text-slate-500 mt-1">Official records of crop quantity, quality verification, and pricing</p>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-xs text-slate-500 bg-white">Loading procurement receipts...</div>
      ) : procurements.length === 0 ? (
        <div className="glass-card p-12 text-center text-xs text-slate-500 rounded-2xl bg-white">
          <FileCheck className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No completed procurement receipts found yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {procurements.map((p) => (
            <div key={p.id} className="glass-card p-6 rounded-2xl border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-emerald-300 transition-colors">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 font-mono tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{p.receipt_code}</span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{p.actual_quantity_kg.toLocaleString()} kg</h3>
                <div className="flex items-center space-x-3 text-xs text-slate-500 mt-2">
                  <span>Quality: <strong className="text-slate-800">{p.quality_grade}</strong></span>
                  <span>•</span>
                  <span>Moisture: <strong className="text-slate-800">{p.moisture_content_pct}%</strong></span>
                  <span>•</span>
                  <span>Rate: <strong className="text-slate-800">₹{p.unit_price_inr}/kg</strong></span>
                </div>
              </div>

              <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                <span className="text-xs text-slate-500 block">Total Procurement Value</span>
                <span className="text-2xl font-display font-black text-emerald-700">₹{p.total_amount_inr.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {new Date(p.completed_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
