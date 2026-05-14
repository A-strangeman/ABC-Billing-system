import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import PageSEO from '../components/PageSEO';
import AppSidebar from '../components/AppSidebar';
import TopbarControls from '../components/TopbarControls';
import './Reports.css';

export default function Reports() {
  const [data, setData] = useState({ 
    bills: [], 
    metrics: { 
        totalRevenue: 0, 
        totalBills: 0, 
        avgBill: 0, 
        totalDiscount: 0, 
        uniqueCustomers: 0,
        totalProfit: 0
    },
    topProducts: []
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: '', to: '', period: 'month' });
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
  loadReports();
}, [loadReports]);

  const loadReports = useCallback(async () => {
  setLoading(true);
  try {
    const res = await API.getReports(filters);
    const reportData = await res.json();
    setData(reportData);
  } catch (err) {
    console.error("Failed to load reports", err);
  } finally {
    setLoading(false);
  }
}, [filters]);

  const handleQuickFilter = (period) => {
    setFilters({ from: '', to: '', period });
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      <PageSEO page="reports" />
      <div className="reports-page flex h-screen overflow-hidden font-sans">
      <AppSidebar classPrefix="reports" activeKey="reports" />

      <main className="reports-main-scroll flex-1 p-8 overflow-y-auto">
        <header className="reports-topbar flex justify-between items-center p-6 rounded-2xl shadow-sm mb-8">
            <h1 className="reports-title text-2xl font-bold">📊 Business Reports</h1>
            <TopbarControls
                containerClassName="reports-topbar-actions"
                iconButtonClassName="reports-icon-btn"
                onLogout={handleLogout}
                rightContent={
                <button onClick={() => window.print()} className="reports-btn reports-btn-primary px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-transform active:scale-95">🖨️ Print Report</button>
                }
            />
        </header>

        {/* Filters Section (Mirroring original) */}
        <section className="reports-card p-6 rounded-2xl shadow-sm mb-8">
            <h3 className="reports-section-label text-xs font-black uppercase tracking-widest mb-4 border-b pb-2">📅 Filter Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <div>
                    <label className="reports-filter-label text-[10px] font-black uppercase mb-2 block">From</label>
                    <input type="date" className="reports-input w-full text-sm font-medium p-2.5 rounded-xl outline-none transition-all" value={filters.from} onChange={e => setFilters({...filters, from: e.target.value})} />
                </div>
                <div>
                    <label className="reports-filter-label text-[10px] font-black uppercase mb-2 block">To</label>
                    <input type="date" className="reports-input w-full text-sm font-medium p-2.5 rounded-xl outline-none transition-all" value={filters.to} onChange={e => setFilters({...filters, to: e.target.value})} />
                </div>
                <div className="reports-period-wrap flex gap-1.5 p-1 rounded-xl border">
                    {['today', 'week', 'month', 'year'].map(p => (
                        <button 
                          key={p}
                          onClick={() => handleQuickFilter(p)} 
                          className={`reports-period-btn flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filters.period === p ? 'reports-period-btn-active shadow-md' : ''}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
                <button onClick={() => setFilters({ from: '', to: '', period: 'month' })} className="reports-btn-ghost font-black text-[11px] uppercase p-2.5 rounded-xl transition-all">Reset All</button>
            </div>
        </section>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <MetricCard title="Total Revenue" value={`₹${data.metrics?.totalRevenue?.toLocaleString('en-IN') || '0.00'}`} icon="💰" tone="revenue" />
          <MetricCard title="Total Profit" value={`₹${data.metrics?.totalProfit?.toLocaleString('en-IN') || '0.00'}`} icon="🟢" tone="profit" />
          <MetricCard title="Total Bills" value={data.metrics?.totalBills || 0} icon="📋" tone="bills" />
          <MetricCard title="Unique Customers" value={data.metrics?.uniqueCustomers || 0} icon="👥" tone="customers" />
          <MetricCard title="Average Bill" value={`₹${data.metrics?.avgBill?.toLocaleString('en-IN') || '0.00'}`} icon="📈" tone="average" />
          <MetricCard title="Total Discount" value={`₹${data.metrics?.totalDiscount?.toLocaleString('en-IN') || '0.00'}`} icon="💸" tone="discount" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Detailed Table */}
            <section className="reports-card lg:col-span-2 rounded-2xl shadow-sm border flex flex-col">
               <header className="reports-table-header p-6 border-b flex justify-between items-center">
                    <h3 className="reports-heading font-black tracking-tighter uppercase text-[11px]">Recent Invoices</h3>
                    <span className="reports-badge text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm">{data.bills?.length || 0} ITEMS</span>
               </header>
               <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="reports-table-head-row uppercase text-[9px] font-black tracking-widest border-b">
                          <th className="p-6">Estimate</th>
                          <th className="p-6">Customer</th>
                          <th className="p-6">Date</th>
                          <th className="p-6 text-right">Grand Total</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {loading ? (
                           <tr><td colSpan="4" className="reports-empty p-12 text-center italic">Gathering Data...</td></tr>
                        ) : data.bills?.map(bill => (
                          <tr key={bill._id} className="reports-table-row border-b transition-colors cursor-pointer" onClick={() => navigate('/billing', { state: { billId: bill._id, viewOnly: true }})}>
                            <td className="reports-bill-id p-6 font-bold">#{bill.estimateNo}</td>
                            <td className="p-6">
                                <div className="reports-customer-name font-extrabold uppercase tracking-tighter text-xs">{bill.customer?.name || "Anonymous"}</div>
                                <div className="reports-customer-phone text-[10px] font-bold">{bill.customer?.phone || "No Phone"}</div>
                            </td>
                            <td className="reports-date p-6 font-bold text-[10px]">{new Date(bill.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td className="p-6 text-right">
                                <div className="reports-amount font-black text-sm">₹{(bill.total || 0).toFixed(2)}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
               </div>
            </section>

            {/* Top Products (Special Section from original) */}
      <section className="reports-card rounded-2xl shadow-sm border p-6">
                <header className="flex justify-between items-center mb-6">
          <h3 className="reports-heading font-black tracking-tighter uppercase text-[11px]">📦 Top Scaling Products</h3>
                    <span className="text-lg">📈</span>
                </header>
                <div className="space-y-4">
                    {data.topProducts?.map((p, idx) => (
            <div key={idx} className="reports-product-row flex items-center gap-4 p-4 border rounded-2xl transition-all group">
              <div className="reports-product-rank w-8 h-8 rounded-full flex items-center justify-center font-black border transition-colors">
                                {idx + 1}
                            </div>
                            <div className="flex-1 overflow-hidden">
                <div className="reports-product-name font-black text-[11px] truncate uppercase">{p.name}</div>
                <div className="reports-product-qty text-[10px] font-bold uppercase">{p.qty} Units Sold</div>
                            </div>
                            <div className="text-right">
                <div className="reports-product-revenue text-[10px] font-black">₹{p.revenue.toLocaleString()}</div>
                <div className="reports-product-caption text-[9px] font-bold uppercase">Revenue</div>
                            </div>
                        </div>
                    ))}
                    {(!data.topProducts || data.topProducts.length === 0) && (
            <div className="reports-empty text-center py-10 italic text-sm">No sales data for this period</div>
                    )}
                </div>
                
                {/* Export Options (Matching original) */}
        <div className="reports-export-wrap mt-8 pt-8 border-t space-y-3">
          <h4 className="reports-filter-label text-[9px] font-black uppercase mb-4 tracking-widest text-center">Export Options</h4>
          <button className="reports-export-btn w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">📄 Export PDF</button>
          <button className="reports-export-btn w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">📊 Excel Sheet</button>
          <button className="reports-export-btn w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">📋 CSV Format</button>
                </div>
            </section>
        </div>
      </main>
    </div>
    </>
  );
}

function MetricCard({ title, value, icon, tone }) {
  return (
    <div className={`reports-metric-card reports-metric-card--${tone} p-6 rounded-2xl shadow-sm border flex flex-col gap-4 group hover:translate-y-[-4px] transition-all cursor-default relative overflow-hidden`}>
       <div className="reports-metric-ghost absolute top-[-20%] right-[-10%] opacity-5 text-7xl transition-transform group-hover:scale-110">
         {icon}
       </div>
       <div className="reports-metric-icon w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm border">
         {icon}
       </div>
       <div>
         <div className="reports-metric-label text-[9px] font-black uppercase tracking-widest mb-1">{title}</div>
         <div className="reports-metric-value text-lg font-black tracking-tighter">{value}</div>
       </div>
    </div>
  );
}
