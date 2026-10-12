import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../services/api';
import { User, Role } from '../../types';
import { Sprout, UserCheck, MapPin, Wheat, ArrowRight } from 'lucide-react';

export const FarmerRegister: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '+91',
    preferred_language: 'ta',
    address: '',
    village: '',
    district: '',
    state: 'Tamil Nadu',
    farm_name: '',
    land_area_acres: '3.5',
    crop_name: 'Paddy (Rice)',
    variety: 'Ponni',
    expected_quantity_kg: '2500',
    harvest_period: 'September 2026'
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginToken } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone,
        preferred_language: formData.preferred_language,
        address: formData.address,
        village: formData.village,
        district: formData.district,
        state: formData.state,
        farms: [
          {
            farm_name: formData.farm_name || `${formData.full_name}'s Farm`,
            location_address: `${formData.village}, ${formData.district}`,
            district: formData.district,
            land_area_acres: parseFloat(formData.land_area_acres),
            crops: [
              {
                crop_name: formData.crop_name,
                variety: formData.variety,
                expected_quantity_kg: parseFloat(formData.expected_quantity_kg),
                harvest_period: formData.harvest_period
              }
            ]
          }
        ]
      };

      const res = await apiRequest<{
        access_token: string;
        user_id: string;
        email: string;
        full_name: string;
        role: Role;
        preferred_language: string;
      }>('/auth/farmer/register', 'POST', payload);

      const userObj: User = {
        id: res.user_id,
        email: res.email,
        full_name: res.full_name,
        phone: formData.phone,
        role: res.role,
        preferred_language: res.preferred_language,
        is_active: true,
        created_at: new Date().toISOString()
      };

      loginToken(res.access_token, userObj);
      navigate('/farmer/dashboard');

    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check form fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-2xl glass-card rounded-2xl p-8 border border-emerald-500/20 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/30">
            <Sprout className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white">Farmer Registration</h1>
          <p className="text-xs text-slate-400 mt-1">Register your profile, farm details, & crop yields</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-xs font-bold text-emerald-400 tracking-wider uppercase mb-3 flex items-center space-x-2">
              <UserCheck className="w-4 h-4" />
              <span>1. Personal & Mobile Details</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Selvam Arumugam"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number (SMS Alerts)</label>
                <input
                  type="text"
                  required
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+919876543210"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="farmer@example.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Location details */}
          <div>
            <h3 className="text-xs font-bold text-emerald-400 tracking-wider uppercase mb-3 flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>2. Address & Location</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Village</label>
                <input
                  type="text"
                  required
                  name="village"
                  value={formData.village}
                  onChange={handleChange}
                  placeholder="Thondamuthur"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">District</label>
                <input
                  type="text"
                  required
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  placeholder="Coimbatore"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">State</label>
                <input
                  type="text"
                  required
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Postal Address</label>
              <input
                type="text"
                required
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Door 45, APMC Main Road, Thondamuthur"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Farm & Crop information */}
          <div>
            <h3 className="text-xs font-bold text-emerald-400 tracking-wider uppercase mb-3 flex items-center space-x-2">
              <Wheat className="w-4 h-4" />
              <span>3. Farm & Crop Information</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Land Area (Acres)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  name="land_area_acres"
                  value={formData.land_area_acres}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Crop Type</label>
                <select
                  name="crop_name"
                  value={formData.crop_name}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Paddy (Rice)">Paddy (Rice)</option>
                  <option value="Wheat">Wheat</option>
                  <option value="Maize">Maize</option>
                  <option value="Pulses">Pulses</option>
                  <option value="Cotton">Cotton</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Expected Yield (kg)</label>
                <input
                  type="number"
                  required
                  name="expected_quantity_kg"
                  value={formData.expected_quantity_kg}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Complete Registration & Receive SMS</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            Already registered?{' '}
            <Link to="/farmer/login" className="font-semibold text-emerald-400 hover:text-emerald-300">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
