import React from 'react';

export default function Card({ as: elementTag = 'div', className = '', children }) {
  const Tag = elementTag;
  const classes = ['bg-white rounded-2xl shadow-sm border border-slate-200/60', className].filter(Boolean).join(' ');
  return <Tag className={classes}>{children}</Tag>;
}
