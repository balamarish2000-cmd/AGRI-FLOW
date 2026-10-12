import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { ShieldCheck, Clock } from 'lucide-react';

interface AuditEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  created_at: string;
}

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const list = await apiRequest<AuditEntry[]>('/admin/audit-logs');
        setLogs(list);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="glass-card p-6 rounded-2xl border-amber-500/20">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">SECURITY & COMPLIANCE</span>
        <h1 className="text-2xl font-display font-extrabold text-white mt-1">System Audit Logs</h1>
        <p className="text-xs text-slate-400 mt-1">Traceable logs for user logins, slot bookings, queue shifts, & procurements</p>
      </div>

      <div className="glass-card rounded-2xl border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading audit trail...</div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {logs.map((l) => (
              <div key={l.id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-900/40">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-[10px] font-bold">
                      {l.action}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">{l.entity_type}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{l.details}</p>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                  {new Date(l.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
