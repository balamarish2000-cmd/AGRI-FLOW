import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { NotificationItem, TestSMSResult, SMSRetryResult } from '../../types';
import { Bell, MessageSquare, Send, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Test SMS State
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<TestSMSResult | null>(null);

  // Retry State
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      const list = await apiRequest<NotificationItem[]>('/notifications/my-notifications');
      setNotifications(list);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, 'PATCH');
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      // Ignore
    }
  };

  const triggerTestSMS = async () => {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await apiRequest<TestSMSResult>('/notifications/test-sms', 'POST');
      setTestResult(res);
      await loadNotifications();
    } catch (err: any) {
      setTestResult({
        success: false,
        status: 'FAILED',
        recipient_phone_masked: 'UNKNOWN',
        rendered_message: '',
        error: err.message || 'Failed to dispatch test SMS'
      });
    } finally {
      setTestSending(false);
    }
  };

  const handleRetry = async (notificationId: string) => {
    setRetryingId(notificationId);
    try {
      const res = await apiRequest<SMSRetryResult>(`/notifications/${notificationId}/retry`, 'POST');
      alert(res.success ? `SMS Retry queued! SID: ${res.message_sid || 'N/A'}` : `Retry failed: ${res.error || 'Twilio Error'}`);
      await loadNotifications();
    } catch (err: any) {
      alert(`Retry error: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-6 rounded-2xl border-emerald-200 bg-white shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">IN-APP & REAL TWILIO SMS ALERTS</span>
          <h1 className="text-2xl font-display font-extrabold text-slate-900 mt-1">Notification Inbox</h1>
          <p className="text-xs text-slate-500 mt-1">Real SMS verification pipeline & booking confirmation log</p>
        </div>
        <button
          onClick={triggerTestSMS}
          disabled={testSending}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer shrink-0"
        >
          {testSending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>{testSending ? 'Sending Twilio SMS...' : 'Send Real Test SMS'}</span>
        </button>
      </div>

      {/* Test SMS Result Box */}
      {testResult && (
        <div className={`p-5 rounded-2xl border transition-all ${
          testResult.success 
            ? 'border-emerald-300 bg-emerald-50/80 text-emerald-900' 
            : 'border-red-300 bg-red-50/80 text-red-900'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 font-bold text-sm">
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              <span>{testResult.success ? 'Real Twilio SMS Dispatched Successfully' : 'SMS Dispatch Error'}</span>
            </div>
            <span className="text-[10px] font-mono uppercase bg-white/80 px-2 py-0.5 rounded border border-slate-200 font-bold">
              Status: {testResult.status}
            </span>
          </div>

          <div className="mt-3 text-xs space-y-1 font-mono">
            <p><strong>Recipient:</strong> {testResult.recipient_phone_masked}</p>
            {testResult.message_sid && <p><strong>Twilio Message SID:</strong> {testResult.message_sid}</p>}
            {testResult.error_code && <p className="text-red-700"><strong>Error Code:</strong> {testResult.error_code}</p>}
            {testResult.error && <p className="text-red-700"><strong>Error Detail:</strong> {testResult.error}</p>}
          </div>

          {testResult.rendered_message && (
            <p className="mt-3 text-xs bg-white/70 p-3 rounded-xl border border-slate-200 italic">
              "{testResult.rendered_message}"
            </p>
          )}
        </div>
      )}

      {/* Notifications List */}
      {loading ? (
        <div className="glass-card p-12 text-center text-xs text-slate-500 bg-white rounded-2xl">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="glass-card p-12 text-center text-xs text-slate-500 rounded-2xl bg-white border-slate-200">
          <Bell className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No notifications in your inbox yet.</p>
          <p className="text-[11px] text-slate-400 mt-1">Book a slot or click "Send Real Test SMS" above to test Twilio SMS delivery.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const hasFailedLog = n.logs?.some(l => l.delivery_status === 'FAILED');

            return (
              <div
                key={n.id}
                className={`glass-card p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white ${
                  !n.is_read ? 'border-emerald-400 bg-emerald-50/30 shadow-xs' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <h4 className="text-sm font-bold text-slate-900">{n.title}</h4>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        {n.channel}
                      </span>
                      {n.logs && n.logs.length > 0 && (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          n.logs[0].delivery_status === 'DELIVERED' || n.logs[0].delivery_status === 'SENT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : n.logs[0].delivery_status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {n.logs[0].delivery_status}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 mt-1.5 leading-relaxed whitespace-pre-line">{n.message}</p>

                    {n.logs && n.logs.length > 0 && n.logs[0].masked_phone_number && (
                      <p className="text-[10px] text-slate-400 font-mono mt-2 flex items-center space-x-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
                        <span>Sent to {n.logs[0].masked_phone_number} via {n.logs[0].provider}</span>
                        {n.logs[0].provider_message_id && (
                          <span className="ml-2">| SID: {n.logs[0].provider_message_id}</span>
                        )}
                      </p>
                    )}

                    <span className="text-[10px] text-slate-400 block mt-1 font-medium">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end md:self-auto">
                  {hasFailedLog && (
                    <button
                      onClick={() => handleRetry(n.id)}
                      disabled={retryingId === n.id}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center space-x-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${retryingId === n.id ? 'animate-spin' : ''}`} />
                      <span>Retry SMS</span>
                    </button>
                  )}

                  {!n.is_read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
