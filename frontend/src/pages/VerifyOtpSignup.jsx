import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API } from '../utils/api';
import './VerifyOtpSignup.css';

export default function VerifyOtpSignup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [pendingSignup, setPendingSignup] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSeconds, setOtpSeconds] = useState(300);
  const [resendLoading, setResendLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fromState = location.state?.pendingSignup;
    if (fromState) {
      setPendingSignup(fromState);
      sessionStorage.setItem('pendingSignup', JSON.stringify(fromState));
      return;
    }

    const raw = sessionStorage.getItem('pendingSignup');
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed.mobileNo || !parsed.password || !parsed.organizationName || !parsed.role) {
        throw new Error('Invalid pending signup state');
      }
      setPendingSignup(parsed);
    } catch {
      sessionStorage.removeItem('pendingSignup');
    }
  }, [location.state]);

  useEffect(() => {
    if (!otpSeconds) return undefined;
    const timer = setInterval(() => setOtpSeconds((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [otpSeconds]);

  const handleResendOtp = async () => {
    if (!pendingSignup) return;

    setResendLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await API.requestOtp({ mobileNo: pendingSignup.mobileNo, purpose: 'register' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend OTP');

      setOtpSeconds(data.expiresIn || 300);
      setSuccess(data.otp ? `OTP: ${data.otp} (dev mode)` : 'OTP resent successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!pendingSignup) return;

    if (!otpCode.trim()) {
      setError('Please enter OTP.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const regRes = await API.register({
        organizationName: pendingSignup.organizationName,
        mobileNo: pendingSignup.mobileNo,
        role: pendingSignup.role,
        password: pendingSignup.password,
        otpCode: otpCode.trim(),
        username: pendingSignup.username,
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.error || 'OTP verification failed');

      const loginRes = await API.login({
        mobileNo: pendingSignup.mobileNo,
        password: pendingSignup.password,
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.error || 'Account created, but auto login failed');

      localStorage.setItem('authToken', loginData.token);
      login(loginData.user);

      try {
        await API.seedDefaultCatalog();
      } catch {
        // Non-blocking: user can still add catalog manually.
      }

      sessionStorage.removeItem('pendingSignup');
      setSuccess('Account verified. Redirecting to dashboard...');
      setTimeout(() => navigate('/dashboard', { replace: true }), 700);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMobile = () => {
    if (!pendingSignup) return;
    sessionStorage.setItem('signupDraft', JSON.stringify(pendingSignup));
    sessionStorage.removeItem('pendingSignup');
    navigate('/register');
  };

  if (!pendingSignup) {
    return (
      <div className="verify-otp-page">
        <div className="verify-otp-card">
          <h1>Verify OTP</h1>
          <p className="verify-otp-subtitle">
            Signup details are unavailable. Please go back and submit Create Account again.
          </p>
          <div className="verify-otp-actions">
            <Link to="/register">Go to Create Account</Link>
            <Link to="/login">Back to Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-otp-page">
      <div className="verify-otp-card">
        <h1>Verify OTP</h1>
        <p className="verify-otp-subtitle">
          Enter the OTP sent to {pendingSignup.mobileNo} to complete account setup.
        </p>

        {pendingSignup.debugOtp ? (
          <div className="verify-otp-alert verify-otp-success">
            Dev OTP: <strong>{pendingSignup.debugOtp}</strong>
          </div>
        ) : null}

        {error && <div className="verify-otp-alert verify-otp-error">{error}</div>}
        {success && <div className="verify-otp-alert verify-otp-success">{success}</div>}

        <form onSubmit={handleVerify} className="verify-otp-form">
          <label>OTP</label>
          <input
            type="text"
            placeholder="6-digit OTP"
            autoComplete="one-time-code"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
          />

          <button type="submit" disabled={submitting} className="verify-btn">
            {submitting ? 'Verifying...' : 'Verify and Sign In'}
          </button>
        </form>

        <div className="verify-otp-actions">
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendLoading || otpSeconds > 0}
            className="resend-btn"
          >
            {resendLoading ? 'Sending...' : otpSeconds > 0 ? `Resend in ${otpSeconds}s` : 'Resend OTP'}
          </button>
          <button type="button" onClick={handleEditMobile} className="resend-btn">
            Edit Mobile Number
          </button>
          <Link to="/register">Back to Create Account</Link>
        </div>
      </div>
    </div>
  );
}
