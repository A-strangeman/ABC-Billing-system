function handleLogout() {
  console.log('🔴 Logout button clicked');

  if (confirm('Are you sure you want to logout?')) {
    console.log('👋 Logging out...');

    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    sessionStorage.clear();

    console.log('📍 Current location:', window.location.href);
    console.log('📍 Redirecting to index.html');

    window.location.href = '../index.html';

    setTimeout(() => {
      if (window.location.pathname.includes('welcome.html')) {
        window.location.replace('../index.html');
      }
    }, 100);
  }
}

function getBillTotal(bill) {
  return bill.total || bill.grandTotal || bill.totalAmount || 0;
}

async function loadDashboard() {
  try {
    console.log('📊 Loading dashboard data...');

    const drafts = await API.getAllDrafts();
    console.log('📝 Drafts loaded:', drafts);
    document.getElementById('draftCount').textContent = drafts.length;

    const draftsList = document.getElementById('draftsList');
    if (drafts.length === 0) {
      draftsList.innerHTML = '<p class="empty">No drafts saved</p>';
    } else {
      draftsList.innerHTML = drafts.slice(0, 3).map(draft => `
        <div class="list-item draft-item" data-draft-id="${draft._id}">
          <strong>Draft ${draft.estimateNo || 'Untitled'}</strong>
          <span>${draft.customer?.name || 'No customer'}</span>
          <span class="date">${new Date(draft.createdAt || draft.savedAt).toLocaleDateString()}</span>
        </div>
      `).join('');
    }

    const billsResponse = await API.getBills(1, 20);
    console.log('📋 Bills response:', billsResponse);

    let bills = [];
    if (Array.isArray(billsResponse)) {
      bills = billsResponse;
    } else if (billsResponse.bills && Array.isArray(billsResponse.bills)) {
      bills = billsResponse.bills;
    } else if (billsResponse.data && Array.isArray(billsResponse.data)) {
      bills = billsResponse.data;
    }

    console.log('✅ Bills array:', bills);

    const billsList = document.getElementById('billsList');
    if (bills.length === 0) {
      billsList.innerHTML = '<p class="empty">No bills yet</p>';
    } else {
      billsList.innerHTML = bills.slice(0, 5).map(bill => `
        <div class="list-item bill-item" data-bill-id="${bill._id}">
          <strong>Bill #${bill.estimateNo}</strong>
          <span>${bill.customer?.name || 'Unknown'}</span>
          <span class="amount">₹${getBillTotal(bill).toFixed(2)}</span>
        </div>
      `).join('');
    }

    const today = new Date().toISOString().split('T')[0];
    const todayBills = bills.filter(b => b.date === today);
    document.getElementById('todayBills').textContent = todayBills.length;

    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthBills = bills.filter(b => {
      const billDate = new Date(b.date || b.createdAt);
      return billDate.getMonth() === thisMonth && billDate.getFullYear() === thisYear;
    });
    document.getElementById('monthBills').textContent = monthBills.length;

    const totalRevenue = bills.reduce((sum, b) => sum + getBillTotal(b), 0);
    document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toFixed(2)}`;

    console.log('✅ Dashboard loaded successfully');
  } catch (error) {
    console.error('❌ Error loading dashboard:', error);
    document.getElementById('draftsList').innerHTML = '<p class="empty" style="color: red;">Error loading drafts</p>';
    document.getElementById('billsList').innerHTML = '<p class="empty" style="color: red;">Error loading bills</p>';
  }
}

function editDraft(draftId) {
  console.log('Editing draft:', draftId);
  sessionStorage.setItem('editDraftId', draftId);
  window.location.href = 'make-bill.html';
}

function viewBill(billId) {
  console.log('Viewing bill:', billId);
  sessionStorage.setItem('viewBillId', billId);
  window.location.href = 'edit-bill.html';
}

function setupEventListeners() {
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

  document.getElementById('draftsList')?.addEventListener('click', event => {
    const draftItem = event.target.closest('.draft-item');
    if (!draftItem) return;

    const draftId = draftItem.dataset.draftId;
    if (!draftId) return;
    editDraft(draftId);
  });

  document.getElementById('billsList')?.addEventListener('click', event => {
    const billItem = event.target.closest('.bill-item');
    if (!billItem) return;

    const billId = billItem.dataset.billId;
    if (!billId) return;
    viewBill(billId);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadDashboard();
});
