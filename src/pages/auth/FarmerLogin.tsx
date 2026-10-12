import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiRequest } from '../../services/api';
import { User, Role } from '../../types';
import { Sprout, ArrowRight } from 'lucide-react';

export const FarmerLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginToken } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiRequest<{
        access_token: string;
        user_id: string;
        email: string;
        full_name: string;
        role: Role;
        preferred_language: string;
      }>('/auth/login', 'POST', { email, password });

      const userObj: User = {
        id: res.user_id,
        email: res.email,
        full_name: res.full_name,
        phone: '',
        role: res.role,
        preferred_language: res.preferred_language,
        is_active: true,
        created_at: new Date().toISOString()
      };

      loginToken(res.access_token, userObj);

      if (res.role === 'FARMER') navigate('/farmer/dashboard');
      else if (res.role === 'PROCUREMENT_OFFICER') navigate('/officer/dashboard');
      else navigate('/admin/dashboard');

    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 border border-emerald-200 bg-white shadow-xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-emerald-600/20">
            <Sprout className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-display font-extrabold text-slate-900">Farmer Portal Login</h1>
          <p className="text-xs text-slate-500 mt-1">Access your procurement slots & real-time queue</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Registered Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="farmer.selvam@gmail.com"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-6 cursor-pointer text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Don't have a Farmer Account?{' '}
            <Link to="/farmer/register" className="font-bold text-emerald-700 hover:text-emerald-800">
              Register New Farmer
            </Link>
          </p>

          <div className="mt-6 flex justify-center space-x-4 text-xs font-medium text-slate-500">
            <Link to="/officer/login" className="hover:text-slate-800">Officer Login</Link>
            <span>•</span>
            <Link to="/admin/login" className="hover:text-slate-800">Admin Portal</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
