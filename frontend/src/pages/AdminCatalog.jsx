import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppSidebar from '../components/AppSidebar';
import TopbarControls from '../components/TopbarControls';
import './AdminCatalog.css';

export default function AdminCatalog() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [toast, setToast] = useState({ show: false, message: '', tone: 'info' });

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="catalog-page flex h-screen overflow-hidden font-sans">
      <AppSidebar classPrefix="catalog" activeKey="admin" />
      <main className="catalog-main-scroll flex-1 p-8 overflow-y-auto">
        <header className="catalog-topbar flex justify-between items-center p-6 rounded-2xl shadow-sm mb-8">
          <h1 className="catalog-title text-2xl font-bold">Product Catalog</h1>
          <TopbarControls
            containerClassName="catalog-topbar-actions"
            iconButtonClassName="catalog-icon-btn"
            onLogout={handleLogout}
          />
        </header>
        <div className="text-center py-12">
          <p className="text-lg">Catalog management goes here</p>
        </div>
      </main>
      {toast.show && (
        <div className={`toast-notification fixed bottom-4 right-4 p-4 rounded-lg shadow-lg toast-${toast.tone}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
