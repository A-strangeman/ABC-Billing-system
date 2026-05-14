import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeModeSwitcher() {
  const { resolvedTheme, setMode } = useTheme();
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

  return (
    <div className="rounded-2xl border border-slate-300/70 bg-white/90 p-1.5 shadow-sm backdrop-blur dark-panel">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setMode(nextTheme)}
          title={`Switch to ${nextTheme === 'dark' ? 'Night' : 'Day'} mode`}
          aria-label={`Switch to ${nextTheme === 'dark' ? 'Night' : 'Day'} mode`}
          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all bg-slate-900 text-white shadow-sm"
        >
          <SunMoonIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Theme: {resolvedTheme === 'dark' ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </div>
  );
}

function SunMoonIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.8 4.8l1.4 1.4M13.8 13.8l1.4 1.4M4.8 15.2l1.4-1.4M13.8 6.2l1.4-1.4" />
      <path d="M21 14.5a4.5 4.5 0 1 1-4.5-4.5 3.7 3.7 0 0 0 4.5 4.5Z" />
    </svg>
  );
}

