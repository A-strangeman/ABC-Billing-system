import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API } from '../utils/api';
import { normalizeMobileToTenDigits } from '../utils/mobile';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [data, setData] = useState({ mobileNo: '', otpCode: '', newPassword: '' });
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  React.useEffect(() => {
    if (!otpSeconds) return undefined;
    const timer = setInterval(() => setOtpSeconds((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [otpSeconds]);

  const handleSendOtp = async () => {
    const mobileNo = normalizeMobileToTenDigits(data.mobileNo);
    if (!mobileNo) {
      setError('Enter a valid mobile number (10 digits or +91 format).');
      return;
    }

    setSendingOtp(true);
    setError('');
    setSuccess('');

    try {
      const res = await API.requestResetOtp(mobileNo);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to send OTP');

      setOtpSeconds(payload.expiresIn || 300);
      setSuccess(payload.otp ? `OTP: ${payload.otp} (dev mode)` : 'OTP sent successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const mobileNo = normalizeMobileToTenDigits(data.mobileNo);

    if (!mobileNo || !data.otpCode || data.newPassword.length < 6) {
      setError('Fill all fields correctly. New password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await API.resetPassword({
        mobileNo,
        otpCode: data.otpCode.trim(),
        newPassword: data.newPassword,
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Password reset failed');

      setSuccess('Password reset successful. Redirecting to sign in...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-card">
        <h1>Forgot Password</h1>
        <p className="forgot-subtitle">Reset your password using mobile OTP verification.</p>

        {error && <div className="forgot-alert forgot-error">{error}</div>}
        {success && <div className="forgot-alert forgot-success">{success}</div>}

        <form onSubmit={handleSubmit} className="forgot-form">
          <label>Mobile Number</label>
          <input
            type="tel"
            placeholder="98XXXXXXXX"
            autoComplete="tel"
            value={data.mobileNo}
            onChange={(e) => setData({ ...data, mobileNo: e.target.value })}
          />

          <div className="otp-row">
            <div>
              <label>OTP</label>
              <input
                type="text"
                placeholder="6-digit OTP"
                autoComplete="one-time-code"
                value={data.otpCode}
                onChange={(e) => setData({ ...data, otpCode: e.target.value })}
              />
            </div>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={sendingOtp || otpSeconds > 0}
              className="otp-btn"
            >
              {sendingOtp ? 'Sending...' : otpSeconds > 0 ? `Resend ${otpSeconds}s` : 'Send OTP'}
            </button>
          </div>

          <label>New Password</label>
          <input
            type="password"
            placeholder="Minimum 6 characters"
            autoComplete="new-password"
            value={data.newPassword}
            onChange={(e) => setData({ ...data, newPassword: e.target.value })}
          />

          <button type="submit" disabled={submitting} className="submit-btn">
            {submitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="forgot-links">
          <Link to="/login">Back to Sign In</Link>
          <span>•</span>
          <Link to="/terms">Terms</Link>
          <span>•</span>
          <Link to="/privacy">Privacy</Link>
        </div>
      </div>
    </div>
  );
}
