import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOtpSignup from './pages/VerifyOtpSignup';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Billing = lazy(() => import('./pages/Billing'));
const EditBills = lazy(() => import('./pages/EditBills'));
const Reports = lazy(() => import('./pages/Reports'));
const PriceList = lazy(() => import('./pages/PriceList'));
const AdminCatalog = lazy(() => import('./pages/AdminCatalog'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Profile = lazy(() => import('./pages/Profile'));
const Help = lazy(() => import('./pages/Help'));

const WelcomeRedirect = () => {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />;
};

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#f7f7f9]">
    <div className="h-9 w-9 rounded-full border-4 border-[#ff5454]/20 border-t-[#ff5454] animate-spin" aria-label="Loading page" />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<WelcomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Login />} />
            <Route path="/verify-otp" element={<VerifyOtpSignup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            {/* Protected Area */}
            <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/edit-bills" element={<EditBills />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/price-list" element={<PriceList />} />
                <Route path="/admin" element={<AdminCatalog />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/help" element={<Help />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
