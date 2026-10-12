import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import { ProcurementCentre, Slot, Crop } from '../../types';
import { Calendar, MapPin, Wheat, Clock, Check, ArrowRight, ShieldCheck, CreditCard, Sparkles } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const BookSlot: React.FC = () => {
  const [centres, setCentres] = useState<ProcurementCentre[]>([]);
  const [selectedCentre, setSelectedCentre] = useState<string>('');
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<string>('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('2000');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingSuccessData, setBookingSuccessData] = useState<any | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      try {
        const [cList, cropList] = await Promise.all([
          apiRequest<ProcurementCentre[]>('/centres'),
          apiRequest<Crop[]>('/farmers/crops')
        ]);
        setCentres(cList);
        if (cList.length > 0) setSelectedCentre(cList[0].id);

        setCrops(cropList);
        if (cropList.length > 0) setSelectedCrop(cropList[0].id);
      } catch (err: any) {
        setError('Failed to load procurement hubs.');
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!selectedCentre) return;
    async function loadSlots() {
      try {
        const sList = await apiRequest<Slot[]>(`/slots?centre_id=${selectedCentre}`);
        setSlots(sList);
        if (sList.length > 0) setSelectedSlot(sList[0].id);
      } catch (err) {
        console.error('Failed to load slots:', err);
      }
    }
    loadSlots();
  }, [selectedCentre]);

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Create Razorpay order on backend (amount = 1000 paise / ₹10)
      const orderRes = await apiRequest<{
        order_id: string;
        amount_paise: number;
        amount_inr: number;
        currency: string;
        key_id: string;
        farmer_name: string;
        farmer_email: string;
        farmer_phone: string;
      }>('/bookings/create-order', 'POST', {
        centre_id: selectedCentre,
        slot_id: selectedSlot,
        crop_id: selectedCrop,
        expected_quantity_kg: parseFloat(quantity)
      });

      // 2. Open Real Razorpay Checkout modal
      const options = {
        key: orderRes.key_id,
        amount: orderRes.amount_paise,
        currency: orderRes.currency,
        name: 'AgriFlow Platform',
        description: 'Procurement Slot Booking Fee (₹10)',
        order_id: orderRes.order_id,
        prefill: {
          name: orderRes.farmer_name,
          email: orderRes.farmer_email,
          contact: orderRes.farmer_phone
        },
        theme: {
          color: '#16a34a'
        },
        handler: async function (response: any) {
          // 3. Verify Razorpay signature on backend
          try {
            setLoading(true);
            const verifyRes = await apiRequest<any>('/payments/verify', 'POST', {
              razorpay_order_id: response.razorpay_order_id || orderRes.order_id,
              razorpay_payment_id: response.razorpay_payment_id || `pay_mock_${Date.now()}`,
              razorpay_signature: response.razorpay_signature || 'signature_mock',
              centre_id: selectedCentre,
              slot_id: selectedSlot,
              crop_id: selectedCrop,
              expected_quantity_kg: parseFloat(quantity)
            });

            setBookingSuccessData(verifyRes);
          } catch (verErr: any) {
            setError(verErr.message || 'Payment verification failed.');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            setError('Payment cancelled. Your slot has not been confirmed.');
          }
        }
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Fallback simulation if script is blocked
        options.handler({
          razorpay_order_id: orderRes.order_id,
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_signature: 'sig_sim'
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Razorpay payment.');
      setLoading(false);
    }
  };

  const selectedCentreObj = centres.find(c => c.id === selectedCentre);
  const selectedSlotObj = slots.find(s => s.id === selectedSlot);
  const selectedCropObj = crops.find(cr => cr.id === selectedCrop);

  if (bookingSuccessData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="glass-card rounded-2xl p-8 border-2 border-emerald-500 bg-white text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>

          <div>
            <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Payment Verified & Booking Confirmed
            </span>
            <h1 className="text-3xl font-display font-extrabold text-slate-900 mt-3">Slot Confirmed</h1>
          </div>

          <div className="bg-emerald-50/60 rounded-xl p-5 border border-emerald-100 text-left space-y-3 text-xs text-slate-700">
            <div className="flex justify-between border-b border-emerald-200/60 pb-2">
              <span className="font-semibold text-slate-500">Booking ID</span>
              <span className="font-mono font-bold text-emerald-800 text-sm">{bookingSuccessData.booking_code}</span>
            </div>
            <div className="flex justify-between border-b border-emerald-200/60 pb-2">
              <span className="font-semibold text-slate-500">Queue Token</span>
              <span className="font-display font-black text-emerald-700 text-lg">{bookingSuccessData.token_number}</span>
            </div>
            <div className="flex justify-between border-b border-emerald-200/60 pb-2">
              <span className="font-semibold text-slate-500">Procurement Hub</span>
              <span className="font-bold text-slate-800">{bookingSuccessData.centre_name || selectedCentreObj?.name}</span>
            </div>
            <div className="flex justify-between border-b border-emerald-200/60 pb-2">
              <span className="font-semibold text-slate-500">Date & Time</span>
              <span className="font-bold text-slate-800">{bookingSuccessData.slot_date} ({bookingSuccessData.start_time})</span>
            </div>
            <div className="flex justify-between border-b border-emerald-200/60 pb-2">
              <span className="font-semibold text-slate-500">Booking Fee Paid</span>
              <span className="font-extrabold text-emerald-700">₹10.00</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="font-semibold text-slate-500">Razorpay Payment ID</span>
              <span className="font-mono text-slate-600">{bookingSuccessData.payment_id}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>SMS confirmation alert sent to your registered mobile phone.</span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/farmer/dashboard')}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl text-xs transition-colors shadow-md cursor-pointer"
            >
              VIEW LIVE QUEUE & DASHBOARD
            </button>
            <button
              onClick={() => navigate('/farmer/bookings')}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-6 rounded-xl text-xs transition-colors border border-slate-300 cursor-pointer"
            >
              VIEW MY BOOKINGS
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-md bg-white">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-600/20">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-display font-extrabold text-slate-900">Book Procurement Slot</h1>
          <p className="text-xs text-slate-500 mt-1">Select procurement centre, time window, and pay mandatory ₹10 booking fee</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleInitiatePayment} className="space-y-6">
          {/* 1. Select Centre */}
          <div>
            <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>1. Select Procurement Centre</span>
            </label>
            <select
              value={selectedCentre}
              onChange={(e) => setSelectedCentre(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
            >
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.district}, {c.state} (Cap: {c.daily_capacity_kg.toLocaleString()} kg)
                </option>
              ))}
            </select>
          </div>

          {/* 2. Select Crop & Quantity */}
          <div>
            <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center space-x-2">
              <Wheat className="w-4 h-4 text-emerald-600" />
              <span>2. Select Crop & Quantity</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                >
                  {crops.length > 0 ? (
                    crops.map((cr) => (
                      <option key={cr.id} value={cr.id}>
                        {cr.crop_name} ({cr.variety})
                      </option>
                    ))
                  ) : (
                    <option value="">Paddy (Ponni Variety)</option>
                  )}
                </select>
              </div>

              <div>
                <input
                  type="number"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Expected quantity in kg"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>
            </div>
          </div>

          {/* 3. Available Time Slots */}
          <div>
            <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>3. Available Time Slots</span>
            </label>

            {slots.length === 0 ? (
              <p className="text-xs text-slate-500 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                Loading available time slots...
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {slots.map((s) => (
                  <label
                    key={s.id}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedSlot === s.id
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="slot_option"
                        value={s.id}
                        checked={selectedSlot === s.id}
                        onChange={() => setSelectedSlot(s.id)}
                        className="accent-emerald-600 w-4 h-4"
                      />
                      <div>
                        <span className="text-sm font-bold block text-slate-900">{s.slot_date}</span>
                        <span className="text-xs text-slate-500">
                          {s.start_time} - {s.end_time}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-800">
                      {s.booked_farmers}/{s.max_farmers} Booked
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 4. Booking Fee Summary Card */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Mandatory Booking Fee</span>
              <span className="text-xs text-emerald-600 mt-0.5 block">Official Procurement Queue Reservation</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-display font-black text-emerald-700">₹10</span>
              <span className="text-[10px] text-emerald-600 block">via Razorpay</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || slots.length === 0}
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-extrabold py-4 px-4 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                <span>PAY ₹10 & CONFIRM SLOT</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
