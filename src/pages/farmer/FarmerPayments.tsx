import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { Payment } from '../../types';
import { CreditCard, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';

export const FarmerPayments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const list = await apiRequest<Payment[]>('/payments/my-payments');
        setPayments(list);
      } catch (err) {
        console.error('Failed to load payments:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="glass-card p-6 rounded-2xl border-emerald-200 bg-white shadow-sm">
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">RAZORPAY PAYMENT HISTORY</span>
        <h1 className="text-2xl font-display font-extrabold text-slate-900 mt-1">Payment Records</h1>
        <p className="text-xs text-slate-500 mt-1">Verified records of ₹10 procurement booking fees and bank account funds</p>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-xs text-slate-500 bg-white">Loading payment records...</div>
      ) : payments.length === 0 ? (
        <div className="glass-card p-12 text-center text-xs text-slate-500 rounded-2xl bg-white">
          <CreditCard className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No payment transactions found yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((pay) => (
            <div key={pay.id} className="glass-card p-6 rounded-2xl border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-emerald-300 transition-colors">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{pay.payment_ref}</span>
                <h3 className="text-2xl font-display font-black text-slate-900 mt-1">₹{pay.amount_inr.toFixed(2)}</h3>
                {pay.bank_ref_number && (
                  <p className="text-xs text-slate-500 mt-1">Razorpay ID: <span className="text-slate-800 font-mono font-semibold">{pay.bank_ref_number}</span></p>
                )}
                <span className="text-[10px] text-slate-400 block mt-1">
                  {new Date(pay.created_at).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <span className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                  ['SUCCESS', 'COMPLETED'].includes(pay.payment_status) ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' :
                  pay.payment_status === 'PENDING' ? 'bg-amber-50 text-amber-800 border border-amber-300' :
                  'bg-rose-50 text-rose-800 border border-rose-300'
                }`}>
                  {['SUCCESS', 'COMPLETED'].includes(pay.payment_status) ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4 text-amber-600" />}
                  <span>{['SUCCESS', 'COMPLETED'].includes(pay.payment_status) ? 'VERIFIED' : pay.payment_status}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
