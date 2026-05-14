import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppSidebar from '../components/AppSidebar';
import TopbarControls from '../components/TopbarControls';
import './Help.css';

export default function Help() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="help-page flex h-screen overflow-hidden font-sans">
      <AppSidebar classPrefix="help" activeKey="help" includeProfile />
      <main className="help-main-scroll flex-1 p-8 overflow-y-auto">
        <header className="help-topbar flex justify-between items-center p-6 rounded-2xl shadow-sm mb-8">
          <div>
            <h1 className="help-title text-2xl font-bold">Help & Getting Started</h1>
            <p className="help-subtitle text-sm mt-1">Set up your workspace in under 5 minutes.</p>
          </div>
          <TopbarControls
            containerClassName="help-topbar-actions"
            iconButtonClassName="help-icon-btn"
            onLogout={handleLogout}
          />
        </header>
        <div className="text-center py-12">
          <p className="text-lg">Help page content goes here</p>
        </div>
      </main>
    </div>
  );
}
