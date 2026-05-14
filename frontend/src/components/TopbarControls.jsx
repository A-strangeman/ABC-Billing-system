import React from 'react';
import { Link } from 'react-router-dom';
import ThemeModeSwitcher from './ThemeModeSwitcher';

export default function TopbarControls({
  containerClassName,
  iconButtonClassName,
  onLogout,
  leftContent,
  rightContent,
  showLanguageToggle = false,
  language = 'en',
  onLanguageChange,
}) {
  return (
    <div className={`${containerClassName} flex items-center gap-2`}>
      {leftContent}
      <ThemeModeSwitcher />
      {showLanguageToggle && (
        <div className="rounded-2xl border border-slate-300/70 bg-white/90 p-1.5 shadow-sm backdrop-blur dark-panel">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onLanguageChange?.('en')}
              aria-label="Switch language to English"
              className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all ${language === 'en' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange?.('ne')}
              aria-label="Switch language to Nepali"
              className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all ${language === 'ne' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              Nepali
            </button>
          </div>
        </div>
      )}
      <Link
        to="/profile"
        title="My Profile"
        aria-label="Open profile"
        className={`${iconButtonClassName} ring-1 ring-transparent transition-all hover:ring-sky-300/50`}
      >
        <span aria-hidden="true">👤</span>
      </Link>
      <button
        type="button"
        onClick={onLogout}
        title="Logout"
        aria-label="Logout"
        className="rounded-xl border border-rose-300/70 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm transition-all hover:-translate-y-[1px] hover:bg-rose-100 hover:text-rose-800"
      >
        Logout
      </button>
      {rightContent}
    </div>
  );
}
