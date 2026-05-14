import React from 'react';

export default function SectionHeader({ icon, title, className = '' }) {
  const classes = ['text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 tracking-tight', className].filter(Boolean).join(' ');
  return (
    <h2 className={classes}>
      {icon ? <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-sm">{icon}</span> : null}
      {title}
    </h2>
  );
}
