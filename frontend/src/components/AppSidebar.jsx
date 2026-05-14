import React from 'react';
import { Link } from 'react-router-dom';

const ACCOUNT_ITEMS = [
  { key: 'profile', to: '/profile', label: 'My Profile' },
];

const BILLING_ITEMS = [
  { key: 'dashboard', to: '/dashboard', label: 'Dashboard' },
  { key: 'billing', to: '/billing', label: 'Make a New Bill' },
  { key: 'edit-bills', to: '/edit-bills', label: 'Edit Bills' },
];

const PRODUCT_ITEMS = [
  { key: 'admin', to: '/admin', label: 'Manage Catalog' },
  { key: 'price-list', to: '/price-list', label: 'Price List' },
];

const ANALYTICS_ITEMS = [
  { key: 'reports', to: '/reports', label: 'Reports' },
];

const SUPPORT_ITEMS = [
  { key: 'help', to: '/help', label: 'Help & Setup' },
];

const ITEM_BADGES = {
  profile: 'PR',
  dashboard: 'DB',
  billing: 'BL',
  'edit-bills': 'ED',
  admin: 'CT',
  'price-list': 'PL',
  reports: 'RP',
  help: 'HP',
};

export default function AppSidebar({ classPrefix, activeKey, includeProfile = true, title = 'ABC Company' }) {
  const sections = [
    ...(includeProfile ? [{ title: 'ACCOUNT', items: ACCOUNT_ITEMS }] : []),
    { title: 'BILLING', items: BILLING_ITEMS },
    { title: 'PRODUCTS', items: PRODUCT_ITEMS },
    { title: 'ANALYTICS', items: ANALYTICS_ITEMS },
    { title: 'SUPPORT', items: SUPPORT_ITEMS },
  ];

  return (
    <aside className={`${classPrefix}-sidebar w-[260px] p-6 flex flex-col shadow-xl flex-shrink-0`}>
      <h2 className={`${classPrefix}-sidebar-title text-2xl font-bold text-center mb-8 drop-shadow-md`}>{title}</h2>
      <nav className="flex-1">
        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.title}>
              <h3 className="text-[11px] font-extrabold tracking-[0.08em] opacity-80 mb-2">{section.title}</h3>
              <ul className="space-y-2">
                {section.items.map((item) => {
                  const isActive = item.key === activeKey;
                  return (
                    <li
                      key={item.key}
                      className={`${classPrefix}-nav-item rounded-xl transition-all ${isActive ? `${classPrefix}-nav-item-active shadow-sm transform translate-x-1` : ''}`}
                    >
                      <Link to={item.to} className={`flex items-center gap-2 p-3 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                        <span className="app-nav-badge" aria-hidden="true">{ITEM_BADGES[item.key] || '•'}</span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </nav>
    </aside>
  );
}
