import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API } from '../utils/api';
import ThemeModeSwitcher from '../components/ThemeModeSwitcher';
import AppSidebar from '../components/AppSidebar';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import PageSEO from '../components/PageSEO';
import './Dashboard.css';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const welcomeName = useMemo(() => {
    const source = (user?.organizationName || user?.username || '').trim();
    if (!source) return 'Admin';

    return source
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }, [user?.organizationName, user?.username]);
  
  const [drafts, setDrafts] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pendingDraftDeleteId, setPendingDraftDeleteId] = useState(null);
  const [deletingDraft, setDeletingDraft] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [draftsRes, billsRes] = await Promise.all([
          API.getAllDrafts(),
          API.getBills(1, 40)
        ]);
        
        const draftsData = await draftsRes.json();
        const billsRaw = await billsRes.json();
        
        setDrafts(Array.isArray(draftsData) ? draftsData : []);
        
        // Handle different bill response formats
        let billsData = [];
        if (Array.isArray(billsRaw)) {
          billsData = billsRaw;
        } else if (billsRaw.bills && Array.isArray(billsRaw.bills)) {
          billsData = billsRaw.bills;
        } else if (billsRaw.data && Array.isArray(billsRaw.data)) {
          billsData = billsRaw.data;
        }
        setBills(billsData);
        
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayBills = bills.filter(b => b.date === today);
    
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthBills = bills.filter(b => {
      const billDate = new Date(b.date || b.createdAt);
      return billDate.getMonth() === thisMonth && billDate.getFullYear() === thisYear;
    });

    const totalRevenue = bills.reduce((sum, b) => sum + (b.total || 0), 0);
    
    return {
      today: todayBills.length,
      month: monthBills.length,
      drafts: drafts.length,
      revenue: totalRevenue.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
    };
  }, [bills, drafts]);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleDeleteDraft = async (draftId) => {
    setPendingDraftDeleteId(draftId);
  };

  const confirmDeleteDraft = async () => {
    if (!pendingDraftDeleteId || deletingDraft) return;
    try {
      setDeletingDraft(true);
      const res = await API.deleteDraft(pendingDraftDeleteId);
      if (!res.ok) {
        const payload = await res.json();
        console.error(payload.error || payload.message || 'Failed to delete draft');
        return;
      }

      setDrafts((prev) => prev.filter((d) => d._id !== pendingDraftDeleteId));
      setPendingDraftDeleteId(null);
    } catch (error) {
      console.error('Failed to delete draft', error);
    } finally {
      setDeletingDraft(false);
    }
  };

  const confirmLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  return (
    <>
      <PageSEO page="dashboard" />
      <div className="dashboard-page flex h-screen overflow-hidden font-sans">
      <AppSidebar classPrefix="dashboard" activeKey="dashboard" includeProfile />

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto dashboard-main-scroll">
        <header className="dashboard-topbar flex justify-between items-center p-6 rounded-2xl shadow-sm mb-8">
          <h1 className="dashboard-welcome text-2xl font-bold">Welcome, {welcomeName}</h1>
          <div className="flex items-center gap-3">
            <ThemeModeSwitcher />
            <Link
              to="/profile"
              title="My Profile"
              aria-label="Open profile"
              className="dashboard-profile-btn h-10 w-10 rounded-xl flex items-center justify-center text-lg transition-colors"
            >
              <span aria-hidden="true">👤</span>
            </Link>
            <PrimaryButton onClick={handleLogout} className="px-4 py-2 dashboard-logout-btn">
              Logout
            </PrimaryButton>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Today's Bills" value={stats.today} />
          <StatCard title="This Month" value={stats.month} />
          <StatCard title="Drafts Saved" value={stats.drafts} />
          <StatCard title="Total Revenue" value={stats.revenue} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Drafts */}
          <Card as="section" className="p-6 dashboard-section dashboard-drafts-panel">
            <SectionHeader icon="📝" title="Recent Drafts" className="dashboard-section-heading" />
            <div className="space-y-4 max-height-[400px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <p className="text-center italic py-4 dashboard-drafts-empty">Loading drafts...</p>
              ) : drafts.length === 0 ? (
                <p className="text-center italic py-4 dashboard-drafts-empty">No drafts saved</p>
              ) : (
                drafts.slice(0, 5).map(draft => (
                  <div 
                    key={draft._id} 
                    className="dashboard-draft-row flex justify-between items-center p-4 rounded-xl transition-colors cursor-pointer group"
                    onClick={() => navigate('/billing', { state: { draftId: draft._id } })}
                  >
                    <div>
                      <div className="dashboard-draft-id font-bold group-hover:underline">Draft #{draft.estimateNo || '---'}</div>
                      <div className="dashboard-draft-name text-sm font-medium">{draft.customer?.name || 'No customer'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="dashboard-draft-date text-xs font-mono">
                        {new Date(draft.createdAt || draft.savedAt).toLocaleDateString()}
                      </div>
                      <button
                        type="button"
                        className="dashboard-draft-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDraft(draft._id);
                        }}
                        aria-label="Delete draft"
                        title="Delete draft"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Recent Bills */}
          <Card as="section" className="p-6 dashboard-section">
            <SectionHeader icon="📋" title="Recent Bills" className="dashboard-section-heading" />
            <div className="space-y-4 max-height-[400px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <p className="text-center italic py-4 dashboard-drafts-empty">Loading bills...</p>
              ) : bills.length === 0 ? (
                <p className="text-center italic py-4 dashboard-drafts-empty">No bills yet</p>
              ) : (
                bills.slice(0, 8).map(bill => (
                  <div 
                    key={bill._id} 
                    className="dashboard-bill-row flex justify-between items-center p-4 rounded-xl transition-colors cursor-pointer group"
                    onClick={() => navigate('/reports')}
                  >
                    <div>
                      <div className="dashboard-bill-id font-bold group-hover:underline">Bill #{bill.estimateNo}</div>
                      <div className="dashboard-bill-name text-sm font-medium">{bill.customer?.name || 'Unknown'}</div>
                    </div>
                    <div className="text-right">
                      <div className="dashboard-bill-amount font-bold">₹{(bill.total || 0).toFixed(2)}</div>
                      <div className="dashboard-bill-date text-[10px] font-mono uppercase">{new Date(bill.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </main>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="dashboard-modal w-full max-w-md rounded-2xl p-6 shadow-2xl border animate-[dashboard-fade-in_.2s_ease-out]">
            <h3 className="dashboard-modal-title text-lg font-bold">Confirm Logout</h3>
            <p className="dashboard-modal-text mt-2 text-sm">
              Are you sure you want to logout from your account?
            </p>
            <div className="mt-6 flex gap-3">
              <PrimaryButton
                onClick={() => setShowLogoutModal(false)}
                disabled={loggingOut}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </PrimaryButton>
              <PrimaryButton
                onClick={confirmLogout}
                disabled={loggingOut}
                variant="danger"
                className="flex-1"
              >
                {loggingOut ? 'Logging out...' : 'Yes, Logout'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {pendingDraftDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="dashboard-modal w-full max-w-md rounded-2xl p-6 shadow-2xl border animate-[dashboard-fade-in_.2s_ease-out]">
            <h3 className="dashboard-modal-title text-lg font-bold">Delete Draft</h3>
            <p className="dashboard-modal-text mt-2 text-sm">
              Are you sure you want to delete this draft? This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <PrimaryButton
                onClick={() => setPendingDraftDeleteId(null)}
                disabled={deletingDraft}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </PrimaryButton>
              <PrimaryButton
                onClick={confirmDeleteDraft}
                disabled={deletingDraft}
                variant="danger"
                className="flex-1"
              >
                {deletingDraft ? 'Deleting...' : 'Yes, Delete'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="dashboard-stat-card p-6 rounded-2xl shadow-sm border-b-4 text-center transform hover:-translate-y-1 transition-all">
      <h3 className="dashboard-stat-label text-xs font-bold uppercase tracking-wider mb-2">{title}</h3>
      <p className="dashboard-stat-value text-3xl font-extrabold">{value}</p>
    </div>
  );
}
