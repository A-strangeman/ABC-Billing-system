import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API } from '../utils/api';
import { normalizeMobileToTenDigits } from '../utils/mobile';
import PageSEO from '../components/PageSEO';
import './Login.css';

export default function Login() {
  const googleButtonRef = useRef(null);
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '' });
  const [showSignupGuide, setShowSignupGuide] = useState(false);

  // Form States
  const [loginData, setLoginData] = useState({ mobileNo: '', password: '' });
  const [signupData, setSignupData] = useState({ organizationName: '', mobileNo: '', role: '', password: '' });

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
     if (location.pathname === '/register') setActiveTab('signup');
     else if (location.pathname === '/login') setActiveTab('login');
  }, [location]);

  useEffect(() => {
    if (activeTab !== 'signup') return;

    const raw = sessionStorage.getItem('signupDraft');
    if (!raw) return;

    try {
      const draft = JSON.parse(raw);
      setSignupData({
        organizationName: draft.organizationName || '',
        mobileNo: draft.mobileNo || '',
        role: draft.role || '',
        password: draft.password || '',
      });
      sessionStorage.removeItem('signupDraft');
    } catch {
      sessionStorage.removeItem('signupDraft');
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'login') return;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    let cancelled = false;

    const initializeGoogle = () => {
      if (cancelled || !window.google || !googleButtonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (!response?.credential) return;
          setError(null);
          try {
            const res = await API.googleLogin(response.credential);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Google login failed');

            localStorage.setItem('authToken', data.token);
            login(data.user);
            navigate('/dashboard');
          } catch (err) {
            setError(err.message);
          }
        },
      });

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
      });
    };

    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.head.appendChild(script);
    } else {
      initializeGoogle();
    }

    return () => {
      cancelled = true;
    };
  }, [activeTab, login, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const welcome = params.get('welcome');
    if (location.pathname === '/login' && welcome === '1') {
      setShowSignupGuide(true);
    }
  }, [location.pathname, location.search]);

  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3500);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const normalizedMobile = normalizeMobileToTenDigits(loginData.mobileNo);
    if (!normalizedMobile || !loginData.password) return setError('Please enter a valid mobile number (10 digits or +91 format) and password');
    
    setLoading(true);
    setError(null);
    try {
      const res = await API.login({ mobileNo: normalizedMobile, password: loginData.password });
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (jsonErr) {
          console.error('Failed to parse JSON:', jsonErr, 'Response text:', text);
        // If not valid JSON, treat as error
        throw new Error('Invalid server response');
      }
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('authToken', data.token);
      login(data.user);
      showToast('Signed in successfully — redirecting…');
      const shouldShowHelp = localStorage.getItem('postSignupGuide') === '1';
      if (shouldShowHelp) {
        localStorage.removeItem('postSignupGuide');
      }
      setTimeout(() => navigate(shouldShowHelp ? '/help?new=1' : '/dashboard'), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const { organizationName, mobileNo, role, password } = signupData;
    if (!organizationName || !mobileNo || !role || password.length < 6) {
        return setError('Fill all fields. Password min 6 chars.');
    }

    const normalizedMobile = normalizeMobileToTenDigits(mobileNo);
    if (!normalizedMobile) {
      return setError('Please enter a valid mobile number (10 digits or +91 format).');
    }

    const generatedUsername = organizationName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!generatedUsername) {
      return setError('Organization Name must contain letters or numbers.');
    }

    setLoading(true);
    setError(null);
    try {
      const res = await API.requestOtp({ mobileNo: normalizedMobile, purpose: 'register' });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

      const pendingSignup = {
        organizationName,
        mobileNo: normalizedMobile,
        role: role.toLowerCase(),
        password,
        username: generatedUsername,
        debugOtp: data.otp || '',
      };
      sessionStorage.setItem('pendingSignup', JSON.stringify(pendingSignup));

      if (data.otp) {
        showToast(`OTP: ${data.otp} (dev mode)`);
      }

      navigate('/verify-otp', { state: { pendingSignup } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google login is not configured. Add VITE_GOOGLE_CLIENT_ID in frontend env.');
      return;
    }

    setError('Use the Google button below to continue.');
  };

  return (
    <>
      <PageSEO page={activeTab === 'signup' ? 'signup' : 'login'} />
      <div className="login-page min-h-screen flex items-center justify-center p-6 font-['Inter',sans-serif]">
      <div className="login-shell w-full max-w-[980px] grid grid-cols-1 md:grid-cols-[1fr_420px] min-h-[580px] rounded-[20px] overflow-hidden">
        
        {/* Left Side (Info) */}
        <div className="login-side p-[52px_48px] flex flex-col justify-between hidden md:flex">
          <div className="flex items-center gap-3">
            <div className="login-brand-badge w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg tracking-tighter">AB</div>
            <div className="flex flex-col">
              <span className="login-side-title font-semibold text-base leading-tight">ABC Company</span>
              <span className="login-side-muted text-[11px] tracking-widest uppercase mt-0.5">Billing System</span>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="login-side-title text-3xl font-bold leading-tight tracking-tight">Your business billing,<br /><span className="login-accent">all in one place.</span></h2>
            <p className="login-side-muted text-sm leading-relaxed mb-8">Manage invoices, track payments and keep your team's finances fully organised — from anywhere, at any time.</p>

            <div className="space-y-3.5">
              <FeatureItem title="Invoice Management" desc="Create, send and track invoices with ease" />
              <FeatureItem title="Payment Tracking" desc="Real-time status across all transactions" />
              <FeatureItem title="Multi-User Access" desc="Roles for Admin, Accountant, Staff & Viewer" />
            </div>
          </div>

          <div className="login-side-foot text-[12px] pt-5 border-t border-white/10">© 2026 ABC Company. All rights reserved.</div>
        </div>

        {/* Right Side (Form) */}
        <div className="login-form-pane p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h3 className="login-heading text-[22px] font-bold tracking-tight mb-1">{activeTab === 'login' ? 'Sign in to your account' : 'Create your account'}</h3>
            <p className="login-muted text-[13.5px]">{activeTab === 'login' ? 'Enter your credentials to access the dashboard.' : 'Fill in the details below to get started.'}</p>
          </div>

          {/* Tabs */}
          <div className="login-tabs flex border-b-[1.5px] mb-6 md:mb-8">
            <Link
              to="/login"
              className={`login-tab flex-1 py-3 text-[13px] font-medium transition-all border-b-2 -mb-[1.5px] ${activeTab === 'login' ? 'login-tab-active font-semibold' : 'login-tab-inactive'}`}
              onClick={() => setError(null)}
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className={`login-tab flex-1 py-3 text-[13px] font-medium transition-all border-b-2 -mb-[1.5px] ${activeTab === 'signup' ? 'login-tab-active font-semibold' : 'login-tab-inactive'}`}
              onClick={() => setError(null)}
            >
              Create Account
            </Link>
          </div>

          {error && <div className="login-error text-xs p-3 rounded-lg mb-6 flex items-center gap-2 font-medium"><span>⚠️</span> {error}</div>}

          {activeTab === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={loginData.mobileNo}
                onChange={() => {}}
                tabIndex={-1}
                aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
              />
              <InputField 
                label="Mobile Number" 
                type="tel" 
                placeholder="+91 98XXXXXXXX" 
                autoComplete="tel"
                value={loginData.mobileNo}
                onChange={e => setLoginData({...loginData, mobileNo: e.target.value})}
              />
              <InputField 
                label="Password" 
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••" 
                autoComplete="current-password"
                showEye 
                onToggleEye={() => setShowPassword(!showPassword)}
                value={loginData.password}
                onChange={e => setLoginData({...loginData, password: e.target.value})}
              />
              <div className="flex items-center justify-between py-1">
                <label className="login-label-muted flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input type="checkbox" className="login-check w-3.5 h-3.5 rounded" />
                  Keep me signed in
                </label>
                <Link to="/forgot-password" className="login-link text-xs font-semibold hover:underline">Forgot password?</Link>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className={`login-btn w-full py-3 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${loading ? 'opacity-80 cursor-not-allowed' : 'active:scale-[0.98]'}`}
              >
                {loading ? <Spinner /> : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all border border-red-200 text-red-600 hover:bg-red-50"
              >
                Continue with Google
              </button>
              <div ref={googleButtonRef} className="flex justify-center mt-2" />
              <p className="login-muted text-[11px] text-center mt-6">Protected with industry-standard encryption.</p>
            </form>
          ) : (
            /* Signup Form */
            <form onSubmit={handleSignup} className="space-y-4">
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={signupData.mobileNo}
                onChange={() => {}}
                tabIndex={-1}
                aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
              />
              <InputField 
                label="Organization Name" 
                type="text" 
                placeholder="ABC Company" 
                autoComplete="organization"
                value={signupData.organizationName}
                onChange={e => setSignupData({...signupData, organizationName: e.target.value})}
              />
              <InputField
                label="Mobile Number"
                type="tel"
                placeholder="+91 98XXXXXXXX"
                autoComplete="tel"
                value={signupData.mobileNo}
                onChange={e => setSignupData({...signupData, mobileNo: e.target.value})}
              />
              <div className="space-y-1.5">
                <label className="login-label-muted block text-[12px] font-medium">Role</label>
                <div className="relative">
                  <select 
                    className="login-input w-full pl-[13px] pr-[13px] py-[10px] border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-all appearance-none cursor-pointer"
                    value={signupData.role}
                    onChange={e => setSignupData({...signupData, role: e.target.value})}
                  >
                    <option value="">Select role</option>
                    <option value="admin">Admin</option>
                    <option value="accountant">Accountant</option>
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>
              <InputField 
                label="Password" 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Min. 8 characters" 
                autoComplete="new-password"
                showEye 
                onToggleEye={() => setShowPassword(!showPassword)}
                value={signupData.password}
                onChange={e => setSignupData({...signupData, password: e.target.value})}
              />
              <button 
                type="submit" 
                disabled={loading}
                className={`login-btn w-full py-3 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${loading ? 'opacity-80 cursor-not-allowed' : 'active:scale-[0.98]'}`}
              >
                {loading ? <Spinner /> : 'Continue to OTP'}
              </button>
              <p className="login-muted text-[11px] text-center mt-6">By creating an account you agree to our <Link to="/terms" className="login-link hover:underline">Terms</Link> & <Link to="/privacy" className="login-link hover:underline">Privacy Policy</Link>.</p>
            </form>
          )}
        </div>
      </div>

      {/* Custom Toast */}
      {toast.show && (
        <div className="login-toast fixed top-5 right-5 z-[9999] rounded-xl p-[13px_18px] text-[13px] font-medium flex items-center gap-3 animate-toast-in">
          <div className="login-toast-dot w-2 h-2 rounded-full"></div>
          {toast.msg}
        </div>
      )}

      {showSignupGuide && (
        <div className="login-guide-overlay fixed inset-0 z-[9998] flex items-center justify-center p-6">
          <div className="login-guide-panel w-full max-w-[620px] rounded-2xl p-6 md:p-7">
            <h4 className="login-guide-title text-xl font-bold mb-1">Welcome to ABC Billing</h4>
            <p className="login-guide-muted text-sm mb-5">
              Your account is ready. Use this setup flow once and you will be production-ready quickly.
            </p>

            <div className="space-y-2 mb-6">
              <GuideStep text="Sign in with your new account credentials." />
              <GuideStep text="Open Help & Setup and complete the checklist." />
              <GuideStep text="Add your first category, material, size, and fitting." />
              <GuideStep text="Create your first bill and verify PDF output." />
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowSignupGuide(false)}
                className="login-guide-btn login-guide-btn-ghost px-4 py-2 rounded-lg text-sm font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSignupGuide(false);
                  navigate('/login', { replace: true });
                }}
                className="login-guide-btn login-guide-btn-primary px-4 py-2 rounded-lg text-sm font-semibold"
              >
                Continue to Sign In
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  );
}

function GuideStep({ text }) {
  return (
    <div className="login-guide-step rounded-lg p-3 text-sm flex items-start gap-2">
      <span className="mt-0.5">•</span>
      <span>{text}</span>
    </div>
  );
}

function FeatureItem({ title, desc }) {
  return (
    <div className="login-feature flex gap-3 p-[16px_18px] rounded-xl">
      <div className="login-feature-dot w-2 h-2 rounded-full shrink-0 mt-1.5"></div>
      <div>
        <div className="login-feature-title text-[13px] font-semibold mb-0.5">{title}</div>
        <div className="login-side-muted text-[12px] leading-normal">{desc}</div>
      </div>
    </div>
  );
}

function InputField({ label, type, placeholder, showEye, onToggleEye, value, onChange, autoComplete }) {
  return (
    <div className="space-y-1.5">
      <label className="login-label-muted block text-[12px] font-medium">{label}</label>
      <div className="relative">
        <input 
          type={type} 
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          className="login-input w-full pl-[13px] pr-[13px] py-[10px] border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-all"
        />
        {showEye && (
          <button 
            type="button" 
            onClick={onToggleEye}
            className="login-eye-btn absolute right-[11px] top-1/2 -translate-y-1/2 transition-colors"
          >
            <EyeIcon />
          </button>
        )}
      </div>
    </div>
  );
}

// Icons
const EyeIcon = () => <svg className="w-[15px] h-[15px] fill-none stroke-2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const Spinner = () => <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>;
