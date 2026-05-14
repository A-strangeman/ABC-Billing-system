import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export const AdminRoute = () => {
  const { user } = useAuth();
  
  if (!user || user.role !== 'admin') {
     return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
