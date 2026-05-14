import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './NotFound.css';

export default function NotFound() {
  const { user } = useAuth();
  const location = useLocation();
  const homePath = user ? '/dashboard' : '/login';

  return (
    <div className="notfound-page min-h-screen flex items-center justify-center p-6 font-['Inter',sans-serif]">
      <div className="notfound-shell w-full max-w-[980px] grid grid-cols-1 md:grid-cols-[1fr_420px] min-h-[580px] rounded-[20px] overflow-hidden animate-card-in">
        <div className="notfound-side p-[52px_48px] flex flex-col justify-between hidden md:flex animate-left-in">
          <div className="flex items-center gap-3">
            <div className="notfound-brand-badge w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg tracking-tighter">AB</div>
            <div className="flex flex-col">
              <span className="notfound-side-title font-semibold text-base leading-tight">ABC Company</span>
              <span className="notfound-side-muted text-[11px] tracking-widest uppercase mt-0.5">Billing System</span>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="notfound-side-title text-3xl font-bold leading-tight tracking-tight">
              Oops, this route<br />
              <span className="notfound-accent">does not exist.</span>
            </h2>
            <p className="notfound-side-muted text-sm leading-relaxed">
              The page you requested was not found. It may have been moved, deleted, or the URL may be incorrect.
            </p>
          </div>

          <div className="notfound-side-foot text-[12px] pt-5 border-t border-white/10">© 2026 ABC Company. All rights reserved.</div>
        </div>

        <div className="notfound-pane p-12 flex flex-col justify-center animate-right-in">
          <div className="notfound-badge inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider w-fit animate-pop-in">
            ERROR 404
          </div>
          <h1 className="notfound-heading mt-4 text-[30px] leading-tight font-bold tracking-tight">Page Not Found</h1>
          <p className="notfound-muted mt-3 text-[14px] leading-relaxed">
            We could not find <span className="font-semibold notfound-heading">{location.pathname}</span>.
          </p>

          <div className="mt-8 space-y-3 animate-actions-in">
            <Link
              to={homePath}
              className="notfound-btn-primary w-full inline-flex items-center justify-center py-3 rounded-xl font-bold text-sm transition-all shadow-sm"
            >
              Go to Home
            </Link>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="notfound-btn-ghost w-full py-3 border rounded-xl font-semibold text-sm transition-colors"
            >
              Go Back
            </button>
          </div>

          <p className="notfound-side-muted text-[11px] mt-6">Need access? Contact your administrator for the correct page link.</p>
        </div>
      </div>

    </div>
  );
}
