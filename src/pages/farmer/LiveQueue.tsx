import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import { QueueToken } from '../../types';
import { Clock, RefreshCw } from 'lucide-react';

export const LiveQueue: React.FC = () => {
  const { centre_id } = useParams<{ centre_id: string }>();
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQueue = async () => {
    if (!centre_id) return;
    try {
      const list = await apiRequest<QueueToken[]>(`/queue/live/${centre_id}`);
      setTokens(list);
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();

    const wsUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsUrl}/ws/queue/${centre_id}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'QUEUE_UPDATE') {
          loadQueue();
        }
      } catch (e) {
        // Fallback
      }
    };

    return () => {
      ws.close();
    };
  }, [centre_id]);

  const servingToken = tokens.find(t => t.state === 'CALLED' || t.state === 'PROCESSING');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="glass-card p-6 rounded-2xl border-emerald-200 bg-white flex items-center justify-between shadow-xs">
        <div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">REALTIME QUEUE BOARD</span>
          <h1 className="text-2xl font-display font-extrabold text-slate-900 mt-1">Live Procurement Queue</h1>
          <p className="text-xs text-slate-500 mt-1">Updates instantly when officers call next tokens</p>
        </div>
        <button
          onClick={loadQueue}
          className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-slate-200 transition-colors"
          title="Refresh Queue"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Serving Token Banner */}
      {servingToken && (
        <div className="glass-card p-8 rounded-2xl border-2 border-emerald-300 bg-emerald-50 text-center relative overflow-hidden pulse-emerald shadow-md">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest block mb-2">NOW SERVING AT COUNTER #{servingToken.counter_assigned || 1}</span>
          <span className="text-6xl font-display font-black text-emerald-700 tracking-tight">{servingToken.token_number}</span>
          <span className="block text-xs font-bold text-emerald-800 mt-3">Farmer Called to Procurement Counter</span>
        </div>
      )}

      {/* Queue List Table */}
      <div className="glass-card rounded-2xl border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900">Today's Token Sequence</h3>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">{tokens.length} Total Tokens</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading queue status...</div>
        ) : tokens.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No active queue tokens for today.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tokens.map((t) => (
              <div key={t.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <span className="text-xl font-display font-extrabold text-emerald-700 w-16">{t.token_number}</span>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Position #{t.position}</span>
                    <span className="text-[10px] text-slate-500">Est. Wait: {t.estimated_wait_mins} mins</span>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  t.state === 'CALLED' ? 'bg-emerald-600 text-white' :
                  t.state === 'PROCESSING' ? 'bg-blue-600 text-white' :
                  t.state === 'COMPLETED' ? 'bg-slate-200 text-slate-600' :
                  'bg-amber-50 border border-amber-200 text-amber-800'
                }`}>
                  {t.state}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
