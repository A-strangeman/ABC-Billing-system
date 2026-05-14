import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'theme-mode';

const ThemeContext = createContext(null);

function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialMode() {
  if (typeof window === 'undefined') return 'auto';
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  return saved === 'light' || saved === 'dark' || saved === 'auto' ? saved : 'auto';
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    onChange();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    }

    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  const resolvedTheme = mode === 'auto' ? systemTheme : mode;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme-transition', 'true');
    root.setAttribute('data-theme', resolvedTheme);

    const timeout = window.setTimeout(() => {
      root.removeAttribute('data-theme-transition');
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({
      mode,
      resolvedTheme,
      setMode,
    }),
    [mode, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
