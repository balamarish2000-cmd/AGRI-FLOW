import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { QueueToken, ProcurementCentre } from '../../types';
import { Shield, PhoneCall, CheckCircle2, Play, Check } from 'lucide-react';

export const OfficerDashboard: React.FC = () => {
  const [centre, setCentre] = useState<ProcurementCentre | null>(null);
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Completing Procurement
  const [activeModalToken, setActiveModalToken] = useState<QueueToken | null>(null);
  const [actualQty, setActualQty] = useState('2500');
  const [qualityGrade, setQualityGrade] = useState('Grade A');
  const [unitPrice, setUnitPrice] = useState('24.50');
  const [remarks, setRemarks] = useState('High moisture test passed');
  const [procurementLoading, setProcurementLoading] = useState(false);

  const loadCentreAndQueue = async () => {
    try {
      const centres = await apiRequest<ProcurementCentre[]>('/centres');
      if (centres.length > 0) {
        setCentre(centres[0]);
        const qList = await apiRequest<QueueToken[]>(`/queue/live/${centres[0].id}`);
        setTokens(qList);
      }
    } catch (err) {
      console.error('Officer dashboard load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCentreAndQueue();
  }, []);

  const handleStateTransition = async (tokenId: string, newState: string, counterNum?: number) => {
    try {
      await apiRequest('/queue/transition', 'POST', {
        token_id: tokenId,
        new_state: newState,
        counter_number: counterNum || 1
      });
      loadCentreAndQueue();
    } catch (err: any) {
      alert(err.message || 'State transition failed');
    }
  };

  const handleCompleteProcurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalToken) return;
    setProcurementLoading(true);

    try {
      await apiRequest('/procurements', 'POST', {
        token_id: activeModalToken.id,
        actual_quantity_kg: parseFloat(actualQty),
        quality_grade: qualityGrade,
        unit_price_inr: parseFloat(unitPrice),
        remarks: remarks
      });
      setActiveModalToken(null);
      loadCentreAndQueue();
    } catch (err: any) {
      alert(err.message || 'Failed to complete procurement');
    } finally {
      setProcurementLoading(false);
    }
  };

  const callingToken = tokens.find(t => t.state === 'CALLED');
  const processingToken = tokens.find(t => t.state === 'PROCESSING');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-6 rounded-2xl border-emerald-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">PROCUREMENT OFFICER PORTAL</span>
          <h1 className="text-2xl font-display font-extrabold text-slate-900 mt-1">
            {centre ? centre.name : 'Coimbatore Agricultural Hub'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">Operational Queue Management & Counter Controls</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Active Counters</span>
            <span className="text-lg font-bold text-emerald-700">{centre?.active_counters || 4}</span>
          </div>
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Counter Controls */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border-slate-200 bg-white shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              <span>Counter Queue Controls</span>
            </h3>

            {/* Next waiting token to call */}
            {tokens.filter(t => ['ARRIVED', 'WAITING', 'BOOKED'].includes(t.state)).length > 0 ? (
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <span className="text-xs text-slate-500 font-medium block">Next Farmer in Line</span>
                <span className="text-4xl font-display font-black text-emerald-700 block">
                  {tokens.find(t => ['ARRIVED', 'WAITING', 'BOOKED'].includes(t.state))?.token_number}
                </span>
                <button
                  onClick={() => {
                    const nextT = tokens.find(t => ['ARRIVED', 'WAITING', 'BOOKED'].includes(t.state));
                    if (nextT) handleStateTransition(nextT.id, 'CALLED', 1);
                  }}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer text-xs"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>CALL NEXT FARMER TOKEN</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center p-6 rounded-xl bg-slate-50 border border-slate-100">
                No waiting farmers in queue sequence.
              </p>
            )}
          </div>

          {/* Currently Called / Processing Card */}
          {callingToken && (
            <div className="glass-card p-6 rounded-2xl border-2 border-emerald-300 bg-emerald-50 space-y-3 shadow-xs">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">FARMER CALLED</span>
              <span className="text-3xl font-display font-black text-emerald-700 block">{callingToken.token_number}</span>
              <p className="text-xs text-emerald-800">Farmer is heading to Counter #1</p>
              <button
                onClick={() => handleStateTransition(callingToken.id, 'PROCESSING')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Play className="w-4 h-4" />
                <span>START PROCUREMENT PROCESSING</span>
              </button>
            </div>
          )}

          {processingToken && (
            <div className="glass-card p-6 rounded-2xl border-2 border-blue-300 bg-blue-50 space-y-3 shadow-xs">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">CURRENTLY PROCESSING</span>
              <span className="text-3xl font-display font-black text-blue-800 block">{processingToken.token_number}</span>
              <button
                onClick={() => setActiveModalToken(processingToken)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ENTER QUANTITY & COMPLETE</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Full Queue Operations Table */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-2xl border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">Operational Queue List</h3>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{tokens.length} Farmers Today</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading queue table...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3">Token</th>
                      <th className="px-6 py-3">Position</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tokens.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-bold text-slate-900 text-sm font-mono">{t.token_number}</td>
                        <td className="px-6 py-4">#{t.position}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            t.state === 'CALLED' ? 'bg-emerald-600 text-white' :
                            t.state === 'PROCESSING' ? 'bg-blue-600 text-white' :
                            t.state === 'COMPLETED' ? 'bg-slate-100 text-slate-500' :
                            'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {t.state}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {t.state === 'BOOKED' && (
                            <button
                              onClick={() => handleStateTransition(t.id, 'ARRIVED')}
                              className="px-2.5 py-1 rounded bg-slate-100 text-emerald-800 hover:bg-slate-200 font-bold text-[11px] border border-slate-200"
                            >
                              Mark Arrived
                            </button>
                          )}
                          {t.state === 'ARRIVED' && (
                            <button
                              onClick={() => handleStateTransition(t.id, 'CALLED', 1)}
                              className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-[11px]"
                            >
                              Call Token
                            </button>
                          )}
                          {t.state === 'CALLED' && (
                            <button
                              onClick={() => handleStateTransition(t.id, 'PROCESSING')}
                              className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 font-bold text-[11px]"
                            >
                              Start
                            </button>
                          )}
                          {t.state === 'PROCESSING' && (
                            <button
                              onClick={() => setActiveModalToken(t)}
                              className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-[11px]"
                            >
                              Complete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Procurement Completion Modal */}
      {activeModalToken && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-card rounded-2xl p-6 border border-slate-200 bg-white shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Complete Procurement Workflow</h3>
            <p className="text-xs text-slate-500 mb-6">Enter verified crop weight, quality grade, and rate for Token <strong className="text-emerald-700 font-mono">{activeModalToken.token_number}</strong></p>

            <form onSubmit={handleCompleteProcurement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Actual Verified Quantity (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={actualQty}
                  onChange={(e) => setActualQty(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quality Grade</label>
                <select
                  value={qualityGrade}
                  onChange={(e) => setQualityGrade(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                >
                  <option value="Grade A">Grade A (Premium - Zero Defect)</option>
                  <option value="Grade B">Grade B (Standard)</option>
                  <option value="Grade C">Grade C (Sub-standard)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">MSP / Unit Price (INR per kg)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quality Test Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveModalToken(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={procurementLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md"
                >
                  {procurementLoading ? 'Generating Receipt...' : 'Generate Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
