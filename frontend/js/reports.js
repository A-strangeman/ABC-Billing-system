// ============================================
// REPORTS.JS - Analytics & Charts (FIXED)
// ============================================

let allBills = [];
let filteredBills = [];
let revenueChart, customerChart, paymentChart;

// Date range
let dateFrom = null;
let dateTo = null;

// ============================================
// INIT
// ============================================
async function init() {
  console.log("📊 Initializing reports...");
  
  // Set default date range (this month)
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  
  document.getElementById('dateFrom').value = firstDay.toISOString().split('T')[0];
  document.getElementById('dateTo').value = today.toISOString().split('T')[0];
  
  // Load data
  await loadReportsData();
  
  // Setup event listeners
  setupEventListeners();
}

// ============================================
// LOAD DATA
// ============================================
async function loadReportsData() {
  try {
    console.log("🔄 Loading reports data...");
    
    // Fetch all bills
    const response = await API.getAllBills(1, 1000); // Get more bills for reports
    
    console.log("✅ API Response:", response);
    
    // Handle different response formats
    if (Array.isArray(response)) {
      allBills = response;
    } else if (response.bills && Array.isArray(response.bills)) {
      allBills = response.bills;
    } else if (response.data && Array.isArray(response.data)) {
      allBills = response.data;
    } else {
      console.error("❌ Unexpected response format:", response);
      allBills = [];
    }
    
    console.log(`📦 Loaded ${allBills.length} bills`);
    console.log("Sample bill:", allBills[0]);
    
    if (allBills.length === 0) {
      alert("No bills found in database. Please create some bills first.");
    }
    
    // Apply date filter
    applyDateFilter();
    
  } catch (error) {
    console.error('❌ Error loading reports data:', error);
    alert('Error loading reports data: ' + error.message);
  }
}

// ============================================
// APPLY DATE FILTER
// ============================================
function applyDateFilter() {
  dateFrom = document.getElementById('dateFrom').value;
  dateTo = document.getElementById('dateTo').value;
  
  console.log(`📅 Filtering from ${dateFrom} to ${dateTo}`);
  
  if (!dateFrom || !dateTo) {
    filteredBills = allBills;
  } else {
    filteredBills = allBills.filter(bill => {
      const billDate = new Date(bill.date);
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999); // Include entire end date
      
      return billDate >= from && billDate <= to;
    });
  }
  
  console.log(`✅ Filtered to ${filteredBills.length} bills`);
  
  // Update all reports
  updateMetrics();
  updateCharts();
  updateTables();
}

// ============================================
// UPDATE METRICS
// ============================================


function updateMetrics() {
  // Total Revenue
  const totalRevenue = filteredBills.reduce((sum, bill) => 
    sum + (bill.total || 0), 0  // ✅ Changed from grandTotal
  );
  document.getElementById('totalRevenue').textContent = 
    `₹${totalRevenue.toFixed(2)}`;
  
  // Total Bills
  document.getElementById('totalBills').textContent = filteredBills.length;
  
  // Unique Customers
  const uniqueCustomers = new Set(
    filteredBills.map(b => b.customer?.name).filter(Boolean)
  ).size;
  document.getElementById('uniqueCustomers').textContent = uniqueCustomers;
  
  // Average Bill
  const avgBill = filteredBills.length > 0 
    ? totalRevenue / filteredBills.length 
    : 0;
  document.getElementById('avgBill').textContent = `₹${avgBill.toFixed(2)}`;
  
  // Total Discount
  const totalDiscount = filteredBills.reduce((sum, bill) => 
    sum + (bill.discount || 0), 0
  );
  document.getElementById('totalDiscount').textContent = 
    `₹${totalDiscount.toFixed(2)}`;
  
  const discountPercent = totalRevenue > 0 
    ? (totalDiscount / (totalRevenue + totalDiscount)) * 100 
    : 0;
  document.getElementById('discountPercent').textContent = 
    `${discountPercent.toFixed(1)}%`;
  
  // Pending Balance
  const pendingBalance = filteredBills.reduce((sum, bill) => 
    sum + (bill.balance || 0), 0
  );
  document.getElementById('pendingBalance').textContent = 
    `₹${pendingBalance.toFixed(2)}`;
  
  const balancePercent = totalRevenue > 0 
    ? (pendingBalance / totalRevenue) * 100 
    : 0;
  document.getElementById('balancePercent').textContent = 
    `${balancePercent.toFixed(1)}%`;
}

// ============================================
// UPDATE CHARTS
// ============================================
function updateCharts() {
  console.log("📊 Updating charts...");
  updateRevenueChart();
  updateCustomerChart();
  updateProductsList();
  updatePaymentChart();
}

// Revenue Trend Chart
// REPLACE updateRevenueChart() function (around line 115)

function updateRevenueChart() {
  const ctx = document.getElementById('revenueChart').getContext('2d');
  
  // Group by date
  const revenueByDate = {};
  filteredBills.forEach(bill => {
    const date = bill.date;
    if (!revenueByDate[date]) {
      revenueByDate[date] = 0;
    }
    revenueByDate[date] += bill.total || 0;  // ✅ Changed from grandTotal
  });
  
  // Sort by date
  const sortedDates = Object.keys(revenueByDate).sort();
  const revenues = sortedDates.map(date => revenueByDate[date]);
  
  // Destroy previous chart
  if (revenueChart) {
    revenueChart.destroy();
  }
  
  // Create chart
  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sortedDates.map(d => new Date(d).toLocaleDateString('en-IN', { 
        month: 'short', 
        day: 'numeric' 
      })),
      datasets: [{
        label: 'Revenue (₹)',
        data: revenues,
        borderColor: '#ff6363',
        backgroundColor: 'rgba(255, 99, 99, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '₹' + value.toLocaleString('en-IN');
            }
          }
        }
      }
    }
  });
}
// Top Customers Chart
// REPLACE updateCustomerChart() function (around line 169)

function updateCustomerChart() {
  const ctx = document.getElementById('customerChart').getContext('2d');
  
  // Group by customer
  const revenueByCustomer = {};
  filteredBills.forEach(bill => {
    const customer = bill.customer?.name || 'Unknown';
    if (!revenueByCustomer[customer]) {
      revenueByCustomer[customer] = 0;
    }
    revenueByCustomer[customer] += bill.total || 0;  // ✅ Changed from grandTotal
  });
  
  // Sort and get top 5
  const sortedCustomers = Object.entries(revenueByCustomer)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const customerNames = sortedCustomers.map(c => c[0]);
  const customerRevenues = sortedCustomers.map(c => c[1]);
  
  // Destroy previous chart
  if (customerChart) {
    customerChart.destroy();
  }
  
  // Create chart
  customerChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: customerNames,
      datasets: [{
        data: customerRevenues,
        backgroundColor: [
          '#ff6363',
          '#ffa500',
          '#4caf50',
          '#2196f3',
          '#9c27b0'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// Top Products List
// REPLACE updateProductsList() function (around line 218)

function updateProductsList() {
  const container = document.getElementById('productsList');
  
  // Aggregate products
  const productData = {};
  filteredBills.forEach(bill => {
    if (bill.items) {
      bill.items.forEach(item => {
        const name = item.productName || 'Unknown';  // ✅ Changed from item.product
        if (!productData[name]) {
          productData[name] = { qty: 0, amount: 0 };
        }
        productData[name].qty += item.qty || 0;
        productData[name].amount += item.amount || 0;
      });
    }
  });
  
  // Sort by amount
  const sortedProducts = Object.entries(productData)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 10);
  
  if (sortedProducts.length === 0) {
    container.innerHTML = '<p class="loading">No products found</p>';
    return;
  }
  
  container.innerHTML = sortedProducts.map(([name, data]) => `
    <div class="product-item">
      <span class="product-name">${name}</span>
      <span class="product-quantity">${data.qty} units</span>
      <span class="product-amount">₹${data.amount.toFixed(2)}</span>
    </div>
  `).join('');
}

// Payment Status Chart
// REPLACE updatePaymentChart() function (around line 256)

function updatePaymentChart() {
  const ctx = document.getElementById('paymentChart').getContext('2d');
  
  let fullyPaid = 0;
  let partiallyPaid = 0;
  let unpaid = 0;
  
  filteredBills.forEach(bill => {
    const balance = bill.balance || 0;
    const total = bill.total || 0;  // ✅ Changed from grandTotal
    
    if (balance === 0) {
      fullyPaid += total;
    } else if (balance < total) {
      partiallyPaid += total;
    } else {
      unpaid += total;
    }
  });
  
  // Destroy previous chart
  if (paymentChart) {
    paymentChart.destroy();
  }
  
  // Create chart
  paymentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Fully Paid', 'Partially Paid', 'Unpaid'],
      datasets: [{
        label: 'Amount (₹)',
        data: [fullyPaid, partiallyPaid, unpaid],
        backgroundColor: ['#4caf50', '#ffa500', '#f44336']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '₹' + value.toLocaleString('en-IN');
            }
          }
        }
      }
    }
  });
}

// ============================================
// UPDATE TABLES
// ============================================
function updateTables() {
  updateBillsTable();
  updateCustomersTable();
}

// REPLACE updateBillsTable() function (around line 313)

function updateBillsTable() {
  const tbody = document.getElementById('billsTableBody');
  
  if (filteredBills.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading">No bills found</td></tr>';
    return;
  }
  
  tbody.innerHTML = filteredBills.slice(0, 20).map(bill => `
    <tr>
      <td>${bill.estimateNo}</td>
      <td>${new Date(bill.date).toLocaleDateString()}</td>
      <td>${bill.customer?.name || '-'}</td>
      <td>${bill.items?.length || 0}</td>
      <td>₹${(bill.subTotal || 0).toFixed(2)}</td>
      <td>₹${(bill.discount || 0).toFixed(2)}</td>
      <td>₹${(bill.total || 0).toFixed(2)}</td>
      <td class="${bill.balance > 0 ? 'negative' : 'positive'}">
        ₹${(bill.balance || 0).toFixed(2)}
      </td>
    </tr>
  `).join('');
}

// REPLACE updateCustomersTable() function (around line 344)

function updateCustomersTable() {
  const tbody = document.getElementById('customersTableBody');
  
  // Aggregate by customer
  const customerStats = {};
  filteredBills.forEach(bill => {
    const name = bill.customer?.name || 'Unknown';
    
    if (!customerStats[name]) {
      customerStats[name] = {
        count: 0,
        total: 0,
        pending: 0
      };
    }
    
    customerStats[name].count++;
    customerStats[name].total += bill.total || 0;  // ✅ Changed from grandTotal
    customerStats[name].pending += bill.balance || 0;
  });
  
  // Sort by total
  const sortedCustomers = Object.entries(customerStats)
    .sort((a, b) => b[1].total - a[1].total);
  
  if (sortedCustomers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">No customers found</td></tr>';
    return;
  }
  
  tbody.innerHTML = sortedCustomers.map(([name, stats]) => {
    const avg = stats.total / stats.count;
    
    return `
      <tr>
        <td>${name}</td>
        <td>${stats.count}</td>
        <td>₹${stats.total.toFixed(2)}</td>
        <td>₹${avg.toFixed(2)}</td>
        <td class="${stats.pending > 0 ? 'negative' : 'positive'}">
          ₹${stats.pending.toFixed(2)}
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Apply filter
  document.getElementById('applyFilter')?.addEventListener('click', applyDateFilter);
  
  // Reset filter
  document.getElementById('resetFilter')?.addEventListener('click', () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('dateFrom').value = firstDay.toISOString().split('T')[0];
    document.getElementById('dateTo').value = today.toISOString().split('T')[0];
    
    applyDateFilter();
  });
  
  // Quick filters
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const period = btn.dataset.period;
      const today = new Date();
      let from;
      
      switch(period) {
        case 'today':
          from = new Date();
          break;
        case 'week':
          from = new Date();
          from.setDate(from.getDate() - 7);
          break;
        case 'month':
          from = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        case 'year':
          from = new Date(today.getFullYear(), 0, 1);
          break;
      }
      
      document.getElementById('dateFrom').value = from.toISOString().split('T')[0];
      document.getElementById('dateTo').value = new Date().toISOString().split('T')[0];
      
      document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      applyDateFilter();
    });
  });
  
  // Export buttons
  document.getElementById('exportPDF')?.addEventListener('click', exportToPDF);
  document.getElementById('exportExcel')?.addEventListener('click', exportToExcel);
  document.getElementById('exportCSV')?.addEventListener('click', exportToCSV);
}

// ============================================
// EXPORT FUNCTIONS
// ============================================
// REPLACE exportToCSV() function (around line 444)

function exportToCSV() {
  let csv = 'Bill #,Date,Customer,Items,Amount,Discount,Total,Balance\n';
  
  filteredBills.forEach(bill => {
    csv += `${bill.estimateNo},`;
    csv += `${bill.date},`;
    csv += `${bill.customer?.name || '-'},`;
    csv += `${bill.items?.length || 0},`;
    csv += `${(bill.subTotal || 0).toFixed(2)},`;
    csv += `${(bill.discount || 0).toFixed(2)},`;
    csv += `${(bill.total || 0).toFixed(2)},`;
    csv += `${(bill.balance || 0).toFixed(2)}\n`;
  });
  
  downloadFile(csv, 'reports.csv', 'text/csv');
}
function exportToExcel() {
  alert('Excel export requires additional library. CSV export is available.');
  exportToCSV();
}

function exportToPDF() {
  window.print();
}

function downloadFile(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// START
// ============================================
document.addEventListener('DOMContentLoaded', init);