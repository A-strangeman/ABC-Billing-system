import React from 'react';

const VARIANTS = {
  dark: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 border border-blue-700/60 shadow-[0_8px_20px_rgba(37,99,235,0.25)]',
  danger: 'bg-gradient-to-r from-rose-500 to-rose-600 text-white hover:from-rose-600 hover:to-rose-700 border border-rose-600/60 shadow-[0_8px_20px_rgba(244,63,94,0.22)]',
  outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 bg-transparent',
};

export default function PrimaryButton({
  type = 'button',
  variant = 'dark',
  className = '',
  disabled,
  onClick,
  children,
}) {
  const variantClasses = VARIANTS[variant] || VARIANTS.dark;
  const classes = [
    'rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed',
    variantClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
