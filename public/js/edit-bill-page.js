let currentPage = 1;
let allBills = [];

async function loadBills() {
  const container = document.getElementById('billListContainer');
  container.innerHTML = "<p class='loading'>Loading bills...</p>";

  try {
    console.log('📋 Loading bills, page:', currentPage);
    const data = await API.getAllBills(currentPage, 20);
    console.log('✅ Bills loaded:', data);

    allBills = data.bills || [];

    if (allBills.length === 0) {
      container.innerHTML = "<p class='empty'>No bills found</p>";
      return;
    }

    renderBills(allBills);
    renderPagination(data.pages || 1);
  } catch (error) {
    console.error('❌ Error loading bills:', error);
    container.innerHTML = "<p class='error'>Error loading bills. Please try again.</p>";
  }
}

function renderBills(bills) {
  const container = document.getElementById('billListContainer');

  container.innerHTML = bills.map(bill => `
    <div class="bill-item" id="bill-${bill._id}">
      <div class="bill-info">
        <div class="bill-main">
          <strong>Bill #${bill.estimateNo}</strong>
          <span class="customer">${bill.customer?.name || 'Unknown'}</span>
        </div>
        <div class="bill-meta">
          <span class="date">
            ${bill.date ? new Date(bill.date).toLocaleDateString() : '-'}
          </span>
          <span class="amount">₹${(bill.total || 0).toFixed(2)}</span>
        </div>
      </div>
      <div class="bill-actions">
        <button class="bill-action-btn" data-action="view" data-id="${bill._id}">👁️ View</button>
        <button class="bill-action-btn" data-action="edit" data-id="${bill._id}">✏️ Edit</button>
        <button class="bill-action-btn" data-action="delete" data-id="${bill._id}" data-estimate-no="${bill.estimateNo}">
          🗑️ Delete
        </button>
      </div>
    </div>
  `).join('');
}

function renderPagination(totalPages) {
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';

  if (totalPages <= 1) return;

  if (currentPage > 1) {
    pagination.innerHTML += `<button class="page-btn" data-page="${currentPage - 1}">« Prev</button>`;
  }

  for (let i = 1; i <= totalPages; i += 1) {
    pagination.innerHTML += i === currentPage
      ? `<button class="active">${i}</button>`
      : `<button class="page-btn" data-page="${i}">${i}</button>`;
  }

  if (currentPage < totalPages) {
    pagination.innerHTML += `<button class="page-btn" data-page="${currentPage + 1}">Next »</button>`;
  }
}

function changePage(page) {
  currentPage = page;
  loadBills();
}

function viewBill(id) {
  sessionStorage.setItem('viewBillId', id);
  sessionStorage.setItem('viewOnly', 'true');
  window.location.href = 'make-bill.html';
}

function editBill(id) {
  sessionStorage.setItem('viewBillId', id);
  sessionStorage.removeItem('viewOnly');
  window.location.href = 'make-bill.html';
}

async function deleteBill(id, no) {
  if (!confirm(`Are you sure you want to delete Bill #${no}?\n\nThis action cannot be undone.`)) {
    return;
  }

  try {
    console.log('🗑️ Attempting to delete bill:', id);

    const billElement = document.getElementById(`bill-${id}`);
    if (billElement) {
      billElement.style.opacity = '0.5';
      billElement.style.pointerEvents = 'none';
    }

    const result = await API.deleteBill(id);
    console.log('✅ Delete result:', result);

    if (result.success) {
      alert(`✓ Bill #${no} deleted successfully!`);

      if (billElement) {
        billElement.remove();
      }

      await loadBills();
    } else {
      throw new Error(result.message || 'Failed to delete bill');
    }
  } catch (error) {
    console.error('❌ Error deleting bill:', error);
    alert(`Error: ${error.message || 'Failed to delete bill. Please try again.'}`);

    const billElement = document.getElementById(`bill-${id}`);
    if (billElement) {
      billElement.style.opacity = '1';
      billElement.style.pointerEvents = 'auto';
    }
  }
}

function setupEventListeners() {
  document.getElementById('backBtn')?.addEventListener('click', () => {
    history.back();
  });

  document.getElementById('searchInput')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderBills(
      allBills.filter(b =>
        b.estimateNo.toString().includes(q) ||
        (b.customer?.name || '').toLowerCase().includes(q)
      )
    );
  });

  document.getElementById('sortSelect')?.addEventListener('change', e => {
    const sorted = [...allBills];
    if (e.target.value === 'date-desc') sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (e.target.value === 'date-asc') sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (e.target.value === 'amount-desc') sorted.sort((a, b) => (b.total || 0) - (a.total || 0));
    if (e.target.value === 'amount-asc') sorted.sort((a, b) => (a.total || 0) - (b.total || 0));
    renderBills(sorted);
  });

  document.getElementById('billListContainer')?.addEventListener('click', async event => {
    const actionButton = event.target.closest('.bill-action-btn');
    if (!actionButton) return;

    const action = actionButton.dataset.action;
    const id = actionButton.dataset.id;
    const estimateNo = actionButton.dataset.estimateNo;
    if (!action || !id) return;

    if (action === 'view') viewBill(id);
    if (action === 'edit') editBill(id);
    if (action === 'delete') await deleteBill(id, estimateNo || '');
  });

  document.getElementById('pagination')?.addEventListener('click', event => {
    const pageButton = event.target.closest('.page-btn');
    if (!pageButton) return;

    const page = Number(pageButton.dataset.page);
    if (!Number.isFinite(page)) return;
    changePage(page);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadBills();
});
