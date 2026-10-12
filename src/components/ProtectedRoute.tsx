import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

interface ProtectedRouteProps {
  allowedRoles: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Authenticating session...</p>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/farmer/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect according to user role
    if (user.role === 'PROCUREMENT_OFFICER') return <Navigate to="/officer/dashboard" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/farmer/dashboard" replace />;
  }

  return <Outlet />;
};
