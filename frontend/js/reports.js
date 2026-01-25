// ============================================
// REPORTS.JS - COMPLETE OPTIMIZED VERSION
// Uses server-side aggregation + keeps all export functions
// ============================================

let revenueChart, customerChart, paymentChart;
let dateFrom = null;
let dateTo = null;

// Cache for chart instances to avoid recreation
const chartCache = {
  revenue: null,
  customer: null,
  payment: null
};

// Cache for export data
let exportData = {
  bills: [],
  customers: [],
  summary: null
};

// ============================================
// INIT
// ============================================
async function init() {
  console.log("📊 Initializing optimized reports...");
  
  // Set default date range (this month)
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  
  document.getElementById('dateFrom').value = firstDay.toISOString().split('T')[0];
  document.getElementById('dateTo').value = today.toISOString().split('T')[0];
  
  // Setup event listeners
  setupEventListeners();
  
  // Load data
  await loadReportsData();
}

// ============================================
// LOAD DATA - OPTIMIZED with Parallel Requests
// ============================================
async function loadReportsData() {
  try {
    showLoadingState();
    
    dateFrom = document.getElementById('dateFrom').value;
    dateTo = document.getElementById('dateTo').value;
    
    console.log(`📅 Loading reports: ${dateFrom} to ${dateTo}`);
    
    // Parallel API calls for maximum speed
    const [
      summary,
      revenueTrend,
      topCustomers,
      topProducts,
      paymentStatus,
      recentBills
    ] = await Promise.all([
      API.getReportSummary(dateFrom, dateTo),
      API.getRevenueTrend(dateFrom, dateTo),
      API.getTopCustomers(dateFrom, dateTo, 10), // Get more for export
      API.getTopProducts(dateFrom, dateTo, 10),
      API.getPaymentStatus(dateFrom, dateTo),
      API.getRecentBills(dateFrom, dateTo, 1, 100) // Get more for export
    ]);
    
    // Store for export
    exportData = {
      bills: recentBills,
      customers: topCustomers,
      summary: summary
    };
    
    // Update all sections
    updateMetrics(summary);
    updateRevenueChart(revenueTrend);
    updateCustomerChart(topCustomers.slice(0, 5)); // Show top 5 in chart
    updateProductsList(topProducts);
    updatePaymentChart(paymentStatus);
    updateBillsTable(recentBills.slice(0, 20)); // Show 20 in table
    updateCustomersTable(topCustomers);
    
    console.log("✅ Reports loaded successfully");
    
  } catch (error) {
    console.error('❌ Error loading reports:', error);
    showNotification('Error loading reports: ' + error.message, 'error');
  } finally {
    hideLoadingState();
  }
}

// ============================================
// UPDATE METRICS
// ============================================
function updateMetrics(summary) {
  document.getElementById('totalRevenue').textContent = 
    `₹${(summary.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  document.getElementById('totalBills').textContent = summary.totalBills || 0;
  
  document.getElementById('uniqueCustomers').textContent = summary.uniqueCustomers || 0;
  
  document.getElementById('avgBill').textContent = 
    `₹${(summary.avgBill || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  document.getElementById('totalDiscount').textContent = 
    `₹${(summary.totalDiscount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const discountPercent = summary.totalRevenue > 0 
    ? (summary.totalDiscount / (summary.totalRevenue + summary.totalDiscount)) * 100 
    : 0;
  document.getElementById('discountPercent').textContent = `${discountPercent.toFixed(1)}%`;
  
  document.getElementById('pendingBalance').textContent = 
    `₹${(summary.totalBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const balancePercent = summary.totalRevenue > 0 
    ? (summary.totalBalance / summary.totalRevenue) * 100 
    : 0;
  document.getElementById('balancePercent').textContent = `${balancePercent.toFixed(1)}%`;
}

// ============================================
// UPDATE REVENUE CHART - Optimized Update
// ============================================
function updateRevenueChart(trendData) {
  const ctx = document.getElementById('revenueChart').getContext('2d');
  
  const labels = trendData.map(d => 
    new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  );
  const revenues = trendData.map(d => d.revenue);
  
  // Update existing chart instead of destroying
  if (chartCache.revenue) {
    chartCache.revenue.data.labels = labels;
    chartCache.revenue.data.datasets[0].data = revenues;
    chartCache.revenue.update('none'); // Skip animation for speed
    return;
  }
  
  // Create new chart only if doesn't exist
  chartCache.revenue = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
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
      animation: {
        duration: 0 // Disable animation for speed
      },
      plugins: {
        legend: { display: false }
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
// UPDATE CUSTOMER CHART - Optimized Update
// ============================================
function updateCustomerChart(customersData) {
  const ctx = document.getElementById('customerChart').getContext('2d');
  
  const customerNames = customersData.map(c => c.customerName);
  const customerRevenues = customersData.map(c => c.totalRevenue);
  
  // Update existing chart
  if (chartCache.customer) {
    chartCache.customer.data.labels = customerNames;
    chartCache.customer.data.datasets[0].data = customerRevenues;
    chartCache.customer.update('none');
    return;
  }
  
  // Create new chart
  chartCache.customer = new Chart(ctx, {
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
      animation: {
        duration: 0
      },
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

// ============================================
// UPDATE PRODUCTS LIST
// ============================================
function updateProductsList(productsData) {
  const container = document.getElementById('productsList');
  
  if (productsData.length === 0) {
    container.innerHTML = '<p class="loading">No products found</p>';
    return;
  }
  
  container.innerHTML = productsData.map(product => `
    <div class="product-item">
      <span class="product-name">${product.productName}</span>
      <span class="product-quantity">${product.totalQuantity.toFixed(2)} units</span>
      <span class="product-amount">₹${product.totalAmount.toFixed(2)}</span>
    </div>
  `).join('');
}

// ============================================
// UPDATE PAYMENT CHART - Optimized Update
// ============================================
function updatePaymentChart(statusData) {
  const ctx = document.getElementById('paymentChart').getContext('2d');
  
  const data = [
    statusData.fullyPaid || 0,
    statusData.partiallyPaid || 0,
    statusData.unpaid || 0
  ];
  
  // Update existing chart
  if (chartCache.payment) {
    chartCache.payment.data.datasets[0].data = data;
    chartCache.payment.update('none');
    return;
  }
  
  // Create new chart
  chartCache.payment = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Fully Paid', 'Partially Paid', 'Unpaid'],
      datasets: [{
        label: 'Amount (₹)',
        data: data,
        backgroundColor: ['#4caf50', '#ffa500', '#f44336']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: {
        duration: 0
      },
      plugins: {
        legend: { display: false }
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
function updateBillsTable(bills) {
  const tbody = document.getElementById('billsTableBody');
  
  if (bills.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading">No bills found</td></tr>';
    return;
  }
  
  tbody.innerHTML = bills.map(bill => `
    <tr>
      <td>${bill.estimateNo}</td>
      <td>${new Date(bill.date).toLocaleDateString()}</td>
      <td>${bill.customer?.name || '-'}</td>
      <td>${bill.itemCount || 0}</td>
      <td>₹${(bill.subTotal || 0).toFixed(2)}</td>
      <td>₹${(bill.discount || 0).toFixed(2)}</td>
      <td>₹${(bill.total || 0).toFixed(2)}</td>
      <td class="${bill.balance > 0 ? 'negative' : 'positive'}">
        ₹${(bill.balance || 0).toFixed(2)}
      </td>
    </tr>
  `).join('');
}

function updateCustomersTable(customers) {
  const tbody = document.getElementById('customersTableBody');
  
  if (customers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">No customers found</td></tr>';
    return;
  }
  
  tbody.innerHTML = customers.map(customer => `
    <tr>
      <td>${customer.customerName}</td>
      <td>${customer.billCount}</td>
      <td>₹${customer.totalRevenue.toFixed(2)}</td>
      <td>₹${customer.avgBill.toFixed(2)}</td>
      <td class="${customer.pendingBalance > 0 ? 'negative' : 'positive'}">
        ₹${customer.pendingBalance.toFixed(2)}
      </td>
    </tr>
  `).join('');
}

// ============================================
// LOADING STATES
// ============================================
function showLoadingState() {
  document.querySelectorAll('.metric-value').forEach(el => {
    el.style.opacity = '0.5';
  });
}

function hideLoadingState() {
  document.querySelectorAll('.metric-value').forEach(el => {
    el.style.opacity = '1';
  });
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
  document.getElementById('applyFilter')?.addEventListener('click', loadReportsData);
  
  document.getElementById('resetFilter')?.addEventListener('click', () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('dateFrom').value = firstDay.toISOString().split('T')[0];
    document.getElementById('dateTo').value = today.toISOString().split('T')[0];
    
    loadReportsData();
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
      
      loadReportsData();
    });
  });
  
  // Export buttons
  document.getElementById('exportPDF')?.addEventListener('click', exportToPDF);
  document.getElementById('exportExcel')?.addEventListener('click', exportToExcel);
  document.getElementById('exportCSV')?.addEventListener('click', exportToCSV);
}

// ============================================
// EXPORT TO CSV - COMPLETE IMPLEMENTATION
// ============================================
function exportToCSV() {
  try {
    let csv = 'Bill #,Date,Customer,Items,Sub Total,Discount,Total,Balance\n';
    
    exportData.bills.forEach(bill => {
      csv += `${bill.estimateNo},`;
      csv += `${bill.date},`;
      csv += `"${(bill.customer?.name || '-').replace(/"/g, '""')}",`;
      csv += `${bill.itemCount || 0},`;
      csv += `${(bill.subTotal || 0).toFixed(2)},`;
      csv += `${(bill.discount || 0).toFixed(2)},`;
      csv += `${(bill.total || 0).toFixed(2)},`;
      csv += `${(bill.balance || 0).toFixed(2)}\n`;
    });
    
    // Add summary
    csv += '\n\nSUMMARY\n';
    csv += `Total Bills,${exportData.summary?.totalBills || 0}\n`;
    csv += `Total Revenue,${(exportData.summary?.totalRevenue || 0).toFixed(2)}\n`;
    csv += `Total Discount,${(exportData.summary?.totalDiscount || 0).toFixed(2)}\n`;
    csv += `Pending Balance,${(exportData.summary?.totalBalance || 0).toFixed(2)}\n`;
    
    downloadFile(csv, `ABC-Company-Report-${dateFrom}-to-${dateTo}.csv`, 'text/csv');
    showNotification('✅ CSV file downloaded successfully!', 'success');
    
  } catch (error) {
    console.error('CSV export error:', error);
    showNotification('Error exporting CSV: ' + error.message, 'error');
  }
}

// ============================================
// EXPORT TO EXCEL - COMPLETE IMPLEMENTATION
// ============================================
function exportToExcel() {
  try {
    // Create HTML table for Excel
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    html += '<head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
    html += '<x:Name>Report</x:Name>';
    html += '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>';
    html += '</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->';
    html += '<meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>';
    html += '</head><body>';
    
    // Header
    html += '<table border="1">';
    html += '<tr><th colspan="8" style="background-color:#ff6363;color:white;font-size:16px;font-weight:bold;">ABC Company - Business Report</th></tr>';
    html += `<tr><th colspan="8" style="background-color:#f0f0f0;">Period: ${dateFrom} to ${dateTo}</th></tr>`;
    html += '<tr><th></th></tr>'; // Empty row
    
    // Column headers
    html += '<tr style="background-color:#ff6363;color:white;font-weight:bold;">';
    html += '<th>Bill #</th><th>Date</th><th>Customer</th><th>Items</th>';
    html += '<th>Sub Total</th><th>Discount</th><th>Total</th><th>Balance</th>';
    html += '</tr>';
    
    // Data rows
    exportData.bills.forEach(bill => {
      html += '<tr>';
      html += `<td>${bill.estimateNo}</td>`;
      html += `<td>${bill.date}</td>`;
      html += `<td>${(bill.customer?.name || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
      html += `<td>${bill.itemCount || 0}</td>`;
      html += `<td>₹${(bill.subTotal || 0).toFixed(2)}</td>`;
      html += `<td>₹${(bill.discount || 0).toFixed(2)}</td>`;
      html += `<td>₹${(bill.total || 0).toFixed(2)}</td>`;
      html += `<td>₹${(bill.balance || 0).toFixed(2)}</td>`;
      html += '</tr>';
    });
    
    // Summary section
    const summary = exportData.summary || {};
    html += '<tr><td colspan="8"></td></tr>'; // Empty row
    html += '<tr style="background-color:#f0f0f0;font-weight:bold;">';
    html += '<td colspan="2">SUMMARY</td><td colspan="6"></td></tr>';
    html += `<tr><td colspan="2">Total Bills:</td><td>${summary.totalBills || 0}</td><td colspan="5"></td></tr>`;
    html += `<tr><td colspan="2">Total Revenue:</td><td>₹${(summary.totalRevenue || 0).toFixed(2)}</td><td colspan="5"></td></tr>`;
    html += `<tr><td colspan="2">Total Discount:</td><td>₹${(summary.totalDiscount || 0).toFixed(2)}</td><td colspan="5"></td></tr>`;
    html += `<tr><td colspan="2">Pending Balance:</td><td>₹${(summary.totalBalance || 0).toFixed(2)}</td><td colspan="5"></td></tr>`;
    html += `<tr><td colspan="2">Average Bill:</td><td>₹${(summary.avgBill || 0).toFixed(2)}</td><td colspan="5"></td></tr>`;
    html += `<tr><td colspan="2">Unique Customers:</td><td>${summary.uniqueCustomers || 0}</td><td colspan="5"></td></tr>`;
    
    html += '</table></body></html>';
    
    // Create blob and download
    const blob = new Blob([html], { 
      type: 'application/vnd.ms-excel' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ABC-Company-Report-${dateFrom}-to-${dateTo}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('✅ Excel file downloaded successfully!', 'success');
    
  } catch (error) {
    console.error('Excel export error:', error);
    showNotification('Error exporting Excel: ' + error.message, 'error');
  }
}

// ============================================
// EXPORT TO PDF - Print functionality
// ============================================
function exportToPDF() {
  window.print();
}

// ============================================
// DOWNLOAD FILE HELPER
// ============================================
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
// NOTIFICATION HELPER
// ============================================
function showNotification(message, type = 'info') {
  let notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(notification);
  }
  
  const colors = {
    success: '#4caf50',
    error: '#f44336',
    warning: '#ffc107',
    info: '#2196f3'
  };
  
  notification.style.background = colors[type] || colors.info;
  notification.textContent = message;
  notification.style.display = 'block';
  
  setTimeout(() => {
    notification.style.display = 'none';
  }, 4000);
}

// Add CSS animation for notification
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

// ============================================
// START
// ============================================
document.addEventListener('DOMContentLoaded', init);