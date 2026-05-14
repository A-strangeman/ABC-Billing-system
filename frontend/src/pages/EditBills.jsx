import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../utils/api';
import AppSidebar from '../components/AppSidebar';
import PageSEO from '../components/PageSEO';
import './EditBills.css';

export default function EditBills() {
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  const applyFilters = (allBills, query, sort) => {
    let result = [...allBills];
    
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(b => 
        b.estimateNo.toString().includes(q) || 
        (b.customer?.name || "").toLowerCase().includes(q)
      );
    }

    if (sort === 'date-desc') result.sort((a,b) => new Date(b.date) - new Date(a.date));
    if (sort === 'date-asc') result.sort((a,b) => new Date(a.date) - new Date(b.date));
    if (sort === 'amount-desc') result.sort((a,b) => (b.total || 0) - (a.total || 0));
    if (sort === 'amount-asc') result.sort((a,b) => (a.total || 0) - (b.total || 0));

    setFilteredBills(result);
  };

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.getBills(currentPage, 20);
      const data = await res.json();
      
      const billsData = data.bills || [];
      setBills(billsData);
      setTotalPages(data.pages || 1);
    } catch (err) {
      console.error("Failed to load bills", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  useEffect(() => {
    applyFilters(bills, search, sortBy);
  }, [bills, search, sortBy]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleSort = (e) => {
    setSortBy(e.target.value);
  };

  const handleDelete = async (id, no) => {
    if (!window.confirm(`Are you sure you want to delete Bill #${no}?\n\nThis action cannot be undone.`)) return;
    try {
      const res = await API.deleteBill(id);
      const result = await res.json();
      if (result.success) {
        alert("✓ Bill deleted successfully!");
        loadBills();
      } else {
        alert("Error: " + (result.message || "Failed to delete"));
      }
    } catch {
      alert("Delete failed");
    }
  };

  return (
    <>
      <PageSEO page="editBills" />
      <div className="editbills-page flex h-screen overflow-hidden font-sans">
      <AppSidebar classPrefix="editbills" activeKey="edit-bills" />

      <main className="editbills-main-scroll flex-1 p-8 overflow-y-auto">
        <header className="editbills-topbar flex justify-between items-center p-6 rounded-2xl shadow-sm mb-8">
            <h1 className="editbills-title text-2xl font-bold">Saved Bills</h1>
            <button onClick={() => navigate(-1)} className="editbills-btn-back px-4 py-2 rounded-xl text-sm font-bold transition-colors">← Back</button>
        </header>

        <section className="editbills-card p-8 rounded-2xl shadow-sm border">
           <p className="editbills-label font-bold text-xs uppercase mb-6 tracking-widest">Click on any bill to view, edit, or delete it.</p>

           <div className="flex gap-4 mb-8">
              <input 
                type="text" 
                placeholder="Search by customer name or bill number..." 
                className="editbills-input flex-1 p-3.5 rounded-2xl outline-none transition-all text-sm font-medium"
                value={search}
                onChange={handleSearch}
              />
              <select 
                className="editbills-input p-3.5 rounded-2xl outline-none text-sm font-bold cursor-pointer"
                value={sortBy}
                onChange={handleSort}
              >
                <option value="date-desc">Latest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
           </div>

           <div className="space-y-4 mb-8">
              {loading ? (
                <div className="flex flex-col items-center py-20 gap-4">
                  <div className="editbills-loader w-10 h-10 border-4 rounded-full animate-spin"></div>
                  <p className="editbills-empty italic font-medium">Loading bills...</p>
                </div>
              ) : filteredBills.length === 0 ? (
                <div className="editbills-empty-wrap text-center py-20 rounded-3xl border-2 border-dashed">
                   <p className="editbills-empty font-bold uppercase tracking-widest text-xs">No bills found</p>
                </div>
              ) : (
                filteredBills.map(bill => (
                  <div key={bill._id} className="editbills-row flex flex-col md:flex-row justify-between items-center p-6 rounded-[24px] border shadow-sm transition-all group">
                    <div className="flex items-center gap-6 flex-1">
                       <div className="editbills-chip p-4 rounded-2xl group-hover:scale-110 transition-transform">
                          <span className="editbills-chip-id font-black text-xl tracking-tighter">#{bill.estimateNo}</span>
                       </div>
                       <div>
                          <div className="editbills-customer font-black text-lg uppercase tracking-tighter mb-0.5">{bill.customer?.name || "Anonymous Customer"}</div>
                          <div className="flex items-center gap-3">
                             <span className="editbills-date text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{bill.date ? new Date(bill.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : "-"}</span>
                             <span className="editbills-amount text-sm font-black">₹{(bill.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                       </div>
                    </div>
                    <div className="flex gap-2 mt-4 md:mt-0">
                       <button 
                         onClick={() => navigate('/billing', { state: { billId: bill._id, viewOnly: true } })}
                         className="editbills-action-btn editbills-action-view px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                       >
                         👁️ View
                       </button>
                       <button 
                         onClick={() => navigate('/billing', { state: { billId: bill._id } })}
                         className="editbills-action-btn editbills-action-edit px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                       >
                         ✏️ Edit
                       </button>
                       <button 
                         onClick={() => handleDelete(bill._id, bill.estimateNo)}
                         className="editbills-action-btn editbills-action-delete px-4 py-2.5 rounded-xl transition-all active:scale-95"
                       >
                         🗑️
                       </button>
                    </div>
                  </div>
                ))
              )}
           </div>

           {/* Pagination (Same as in original) */}
           {totalPages > 1 && (
             <div className="editbills-pagination flex justify-center items-center gap-2 mt-12 p-4 rounded-2xl">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className={`editbills-page-btn px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentPage === 1 ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  « Prev
                </button>
                
                {[...Array(totalPages)].map((_, i) => (
                  <button 
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`editbills-page-dot w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === i + 1 ? 'is-active shadow-md' : ''}`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className={`editbills-page-btn px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentPage === totalPages ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  Next »
                </button>
             </div>
           )}
        </section>
      </main>
    </div>
    </>
  );
}
