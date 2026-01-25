// ============================================
// BILLING.JS - Enhanced with Per-Item Percentage
// ============================================

// DOM Elements
const tbody = document.querySelector("#billTable tbody");
const estimateNoEl = document.getElementById("estimateNo");
const billDateEl = document.getElementById("billDate");
const customerNameEl = document.getElementById("customerName");
const customerPhoneEl = document.getElementById("customerPhone");

const addRowBtn = document.getElementById("addRowBtn");
const saveDraftBtn = document.getElementById("saveDraftBtn");
const downloadBtn = document.getElementById("downloadBtn");
const saveBtn = document.getElementById("saveBtn");
const applyPercentBtn = document.getElementById("applyPercentBtn");

const subTotalEl = document.getElementById("subTotal");
const discountPercentEl = document.getElementById("discountPercent");
const discountRsEl = document.getElementById("discountRs");
const grandTotalEl = document.getElementById("grandTotal");
const receivedEl = document.getElementById("received");
const balanceEl = document.getElementById("balance");
const amountWordsEl = document.getElementById("amountWords");

const categoryRow = document.getElementById("categoryRow");
const materialRow = document.getElementById("materialRow");
const sizeRow = document.getElementById("sizeRow");
const fittingRow = document.getElementById("fittingRow");
const priceRow = document.getElementById("priceRow");

const materialSection = document.getElementById("materialSection");
const sizeSection = document.getElementById("sizeSection");
const fittingSection = document.getElementById("fittingSection");
const priceSection = document.getElementById("priceSection");

// State
let activeRow = null;
let currentDraftId = null;

// ============================================
// INIT
// ============================================
async function init() {
  billDateEl.value = new Date().toISOString().split("T")[0];
  
  try {
    const invoiceData = await API.getNextInvoiceNo();
    estimateNoEl.value = invoiceData.nextInvoiceNo;
    
    await Store.loadCatalog();
    renderCategories();
    setupEventListeners();
    await checkForEdit();
    
    if (tbody.querySelectorAll("tr").length === 0) {
      addRow();
    }
    
    setTimeout(() => {
      const firstInput = tbody.querySelector("tr:first-child .productName");
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
      }
    }, 100);
    
  } catch (error) {
    console.error('Init error:', error);
    alert('Error loading page. Please refresh.');
  }
}

// ============================================
// RENDER CATEGORIES
// ============================================
function renderCategories() {
  const categories = Store.catalog.categories;
  
  if (categories.length === 0) {
    categoryRow.innerHTML = '<p class="empty">No categories available</p>';
    return;
  }
  
  categoryRow.innerHTML = categories.map(cat => `
    <span class="chip" data-id="${cat._id}">${cat.name}</span>
  `).join('');
  
  categoryRow.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => onCategoryClick(chip.dataset.id));
  });
}

// ============================================
// CATEGORY CLICK
// ============================================
function onCategoryClick(categoryId) {
  Store.selectCategory(categoryId);
  
  categoryRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  
  const materials = Store.getMaterialsByCategory(categoryId);
  
  if (materials.length === 0) {
    materialSection.style.display = 'none';
    sizeSection.style.display = 'none';
    fittingSection.style.display = 'none';
    return;
  }
  
  materialRow.innerHTML = materials.map(mat => `
    <span class="chip" data-id="${mat._id}">${mat.name}</span>
  `).join('');
  
  materialSection.style.display = 'block';
  sizeSection.style.display = 'none';
  fittingSection.style.display = 'none';
  
  materialRow.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => onMaterialClick(chip.dataset.id));
  });
}

// ============================================
// MATERIAL CLICK
// ============================================
function onMaterialClick(materialId) {
  Store.selectMaterial(materialId);
  
  materialRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  
  const sizes = Store.getSizesByMaterial(materialId);
  
  if (sizes.length > 0) {
    sizeRow.innerHTML = sizes.map(size => `
      <span class="chip" data-id="${size._id}">${size.value}</span>
    `).join('');
    sizeSection.style.display = 'block';
    sizeRow.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => onSizeClick(chip.dataset.id));
    });
  } else {
    sizeSection.style.display = 'none';
  }
  
  const fittings = Store.getFittingsByMaterial(materialId);
  
  if (fittings.length > 0) {
    fittingRow.innerHTML = fittings.map(fit => `
      <span class="chip" data-id="${fit._id}">${fit.name}</span>
    `).join('');
    fittingSection.style.display = 'block';
    fittingRow.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => onFittingClick(chip.dataset.id));
    });
  } else {
    fittingSection.style.display = 'none';
  }
  
  updateActiveRowProduct();
}

// ============================================
// SIZE CLICK
// ============================================
function onSizeClick(sizeId) {
  Store.selectSize(sizeId);
  sizeRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  updateActiveRowProduct();
}

// ============================================
// FITTING CLICK
// ============================================
function onFittingClick(fittingId) {
  Store.selectFitting(fittingId);
  fittingRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  updateActiveRowProduct();
}

// ============================================
// UPDATE ACTIVE ROW PRODUCT
// ============================================
async function updateActiveRowProduct() {
  if (!activeRow) return;
  
  const productName = Store.buildProductName();
  const productInput = activeRow.querySelector('.productName');
  productInput.value = productName;
  
  const qtyInput = activeRow.querySelector('.qty');
  const unitSelect = activeRow.querySelector('.unit');
  handlePlyCalculation(productInput, qtyInput, unitSelect);
  
  if (productName) {
    try {
      const priceHistory = await API.getPriceHistory(productName);
      
      if (priceHistory.length > 0) {
        priceRow.innerHTML = priceHistory.map(ph => `
          <span class="chip price-chip" data-price="${ph.price}">
            ₹${ph.price} (${new Date(ph.date).toLocaleDateString()})
          </span>
        `).join('');
        
        priceSection.style.display = 'block';
        
        priceRow.querySelectorAll('.price-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            const priceInput = activeRow.querySelector('.price');
            priceInput.value = chip.dataset.price;
            computeTotals();
          });
        });
      } else {
        priceSection.style.display = 'none';
      }
    } catch (error) {
      console.error('Error loading price history:', error);
      priceSection.style.display = 'none';
    }
  }
  
  computeTotals();
}

// ============================================
// PLY AUTO-CALCULATION
// ============================================
function handlePlyCalculation(productInput, qtyInput, unitSelect) {
  const productName = productInput.value.trim();
  const plyPattern = /\((\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\)\s*(\d+)/;
  const match = productName.match(plyPattern);
  
  if (match) {
    const height = parseFloat(match[1]);
    const width = parseFloat(match[2]);
    const pieces = parseInt(match[3]);
    const totalSqFt = height * width * pieces;
    
    qtyInput.value = totalSqFt;
    unitSelect.value = "Sq-Ft";
    
    console.log(`✅ Ply calculated: ${height}x${width}x${pieces} = ${totalSqFt} Sq-Ft`);
  }
}

// ============================================
// ADD ROW - ENHANCED with Item Percentage
// ============================================
function addRow(productName = "", qty = 1, unit = "Pcs", price = 0, itemPercent = 0) {
  const tr = document.createElement("tr");
  const sn = tbody.querySelectorAll("tr").length + 1;
  
  tr.innerHTML = `
    <td class="sn">${sn}</td>
    <td><input type="text" class="productName" value="${productName}"></td>
    <td><input type="number" class="qty" min="1" value="${qty}"></td>
    <td>
      <select class="unit">
        <option value="Pcs" ${unit === "Pcs" ? "selected" : ""}>Pcs</option>
        <option value="Kg" ${unit === "Kg" ? "selected" : ""}>Kg</option>
        <option value="Sq-Ft" ${unit === "Sq-Ft" ? "selected" : ""}>Sq-Ft</option>
        <option value="Mtr" ${unit === "Mtr" ? "selected" : ""}>Mtr</option>
        <option value="Bundle" ${unit === "Bundle" ? "selected" : ""}>Bundle</option>
        <option value="ft" ${unit === "ft" ? "selected" : ""}>ft</option>
      </select>
    </td>
    <td><input type="number" class="price" min="0" step="0.01" value="${price}"></td>
    <td>
      <input type="number" class="item-percent" min="-100" max="1000" step="0.1" value="${itemPercent}" 
             placeholder="%" title="Add/subtract percentage to this item">
    </td>
    <td class="row-total">0.00</td>
    <td><button class="del">×</button></td>
  `;
  
  tbody.appendChild(tr);
  
  const productInput = tr.querySelector(".productName");
  const qtyInput = tr.querySelector(".qty");
  const unitSelect = tr.querySelector(".unit");
  const priceInput = tr.querySelector(".price");
  const itemPercentInput = tr.querySelector(".item-percent");
  const delBtn = tr.querySelector(".del");
  
  // Event listeners
  qtyInput.addEventListener("input", computeTotals);
  priceInput.addEventListener("input", computeTotals);
  itemPercentInput.addEventListener("input", computeTotals);
  
  delBtn.addEventListener("click", () => {
    tr.remove();
    renumberRows();
    computeTotals();
  });
  
  tr.addEventListener("click", () => setActiveRow(tr));
  
  // Enter key navigation
  productInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePlyCalculation(productInput, qtyInput, unitSelect);
      qtyInput.focus();
      qtyInput.select();
    }
  });
  
  qtyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      unitSelect.focus();
    }
  });
  
  unitSelect.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      priceInput.focus();
      priceInput.select();
    }
  });
  
  priceInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      itemPercentInput.focus();
      itemPercentInput.select();
    }
  });
  
  itemPercentInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      const hasData = productInput.value.trim() !== "" && 
                     parseFloat(qtyInput.value) > 0 && 
                     parseFloat(priceInput.value) > 0;
      
      if (hasData) {
        addRow();
      } else {
        productInput.focus();
      }
    }
  });
  
  productInput.addEventListener("blur", () => {
    handlePlyCalculation(productInput, qtyInput, unitSelect);
  });
  
  computeTotals();
  
  if (!productName) {
    requestAnimationFrame(() => {
      productInput.focus();
      productInput.select();
    });
  }
  
  setActiveRow(tr);
}

// ============================================
// RENUMBER ROWS
// ============================================
function renumberRows() {
  let sn = 1;
  tbody.querySelectorAll("tr").forEach(tr => {
    tr.querySelector(".sn").textContent = sn++;
  });
}

// ============================================
// SET ACTIVE ROW
// ============================================
function setActiveRow(tr) {
  if (activeRow) activeRow.classList.remove("active");
  activeRow = tr;
  activeRow.classList.add("active");
}

// ============================================
// COMPUTE TOTALS - Enhanced with Item Percentage
// ============================================
function computeTotals() {
  let subTotal = 0;
  
  tbody.querySelectorAll("tr").forEach(tr => {
    const qty = parseFloat(tr.querySelector(".qty").value) || 0;
    const price = parseFloat(tr.querySelector(".price").value) || 0;
    const itemPercent = parseFloat(tr.querySelector(".item-percent").value) || 0;
    
    // Calculate base amount
    let rowTotal = qty * price;
    
    // Apply item percentage
    if (itemPercent !== 0) {
      const adjustment = (rowTotal * itemPercent) / 100;
      rowTotal = rowTotal + adjustment;
    }
    
    tr.querySelector(".row-total").textContent = rowTotal.toFixed(2);
    subTotal += rowTotal;
  });
  
  const discountRs = parseFloat(discountRsEl.value) || 0;
  const received = parseFloat(receivedEl.value) || 0;
  
  const grandTotal = Math.max(subTotal - discountRs, 0);
  const balance = Math.max(grandTotal - received, 0);
  
  subTotalEl.value = subTotal.toFixed(2);
  grandTotalEl.value = grandTotal.toFixed(2);
  balanceEl.value = balance.toFixed(2);
  
  amountWordsEl.value = numberToWordsIndian(Math.round(grandTotal)) + " only";
}

// ============================================
// DISCOUNT HANDLERS
// ============================================
function onDiscountPercentChange() {
  const subTotal = parseFloat(subTotalEl.value) || 0;
  const percent = parseFloat(discountPercentEl.value) || 0;
  const discountRs = (subTotal * percent) / 100;
  discountRsEl.value = discountRs.toFixed(2);
  computeTotals();
}

function onDiscountRsChange() {
  const subTotal = parseFloat(subTotalEl.value) || 0;
  const discountRs = parseFloat(discountRsEl.value) || 0;
  
  if (subTotal > 0) {
    const percent = (discountRs / subTotal) * 100;
    discountPercentEl.value = Math.round(percent);
  }
  
  computeTotals();
}

// ============================================
// CUSTOMER AUTOCOMPLETE
// ============================================
let customerTimeout;

customerNameEl.addEventListener("input", async () => {
  clearTimeout(customerTimeout);
  
  const query = customerNameEl.value;
  if (query.length < 2) return;
  
  customerTimeout = setTimeout(async () => {
    try {
      const customers = await API.searchCustomers(query);
      const datalist = document.getElementById("customerList");
      datalist.innerHTML = customers.map(c => 
        `<option value="${c.name}" data-phone="${c.phone}">${c.name} - ${c.phone}</option>`
      ).join('');
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  }, 300);
});

customerNameEl.addEventListener("change", async () => {
  try {
    const customers = await API.searchCustomers(customerNameEl.value);
    const match = customers.find(c => c.name === customerNameEl.value);
    if (match) {
      customerPhoneEl.value = match.phone || "";
    }
  } catch (error) {
    console.error('Error loading customer:', error);
  }
});

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
  addRowBtn.addEventListener("click", () => addRow());
  saveDraftBtn.addEventListener("click", saveDraft);
  downloadBtn.addEventListener("click", downloadPDF);
  saveBtn.addEventListener("click", saveFinalBill);
  applyPercentBtn.addEventListener("click", applyPercentToAll);
  discountPercentEl.addEventListener("input", onDiscountPercentChange);
  discountRsEl.addEventListener("input", onDiscountRsChange);
  receivedEl.addEventListener("input", computeTotals);
}

// ============================================
// APPLY PERCENTAGE TO ALL ITEMS
// ============================================
function applyPercentToAll() {
  const percent = prompt("Enter percentage to apply to all items:\n(Use + for markup, - for discount)\nExample: 10 or -5");
  
  if (percent === null) return; // User cancelled
  
  const percentValue = parseFloat(percent);
  
  if (isNaN(percentValue)) {
    alert("Please enter a valid number");
    return;
  }
  
  if (percentValue < -100 || percentValue > 1000) {
    alert("Percentage must be between -100 and 1000");
    return;
  }
  
  // Confirm before applying
  const confirmMsg = percentValue >= 0 
    ? `Add ${percentValue}% markup to all items?`
    : `Apply ${Math.abs(percentValue)}% discount to all items?`;
  
  if (!confirm(confirmMsg)) return;
  
  // Apply percentage to all rows and update prices
  let updatedCount = 0;
  tbody.querySelectorAll("tr").forEach(tr => {
    const priceInput = tr.querySelector(".price");
    const currentPrice = parseFloat(priceInput.value) || 0;
    
    if (currentPrice > 0) {
      // Calculate new price with percentage
      const adjustment = (currentPrice * percentValue) / 100;
      const newPrice = currentPrice + adjustment;
      
      // Update the price field with adjusted price
      priceInput.value = newPrice.toFixed(2);
      
      // Reset percentage field to 0 (since we already applied it to price)
      const itemPercentInput = tr.querySelector(".item-percent");
      itemPercentInput.value = 0;
      
      updatedCount++;
    }
  });
  
  computeTotals();
  
  alert(`✓ ${percentValue}% applied to ${updatedCount} item(s)\nPrices updated with markup/discount.`);
}

// ============================================
// GET BILL DATA
// ============================================
function getBillData() {
  const items = [];
  
  tbody.querySelectorAll("tr").forEach(tr => {
    items.push({
      productName: tr.querySelector(".productName").value,
      qty: parseFloat(tr.querySelector(".qty").value) || 0,
      unit: tr.querySelector(".unit").value,
      price: parseFloat(tr.querySelector(".price").value) || 0,
      itemPercent: parseFloat(tr.querySelector(".item-percent").value) || 0,
      amount: parseFloat(tr.querySelector(".row-total").textContent) || 0
    });
  });
  
  return {
    estimateNo: parseInt(estimateNoEl.value),
    date: billDateEl.value,
    customer: {
      name: customerNameEl.value,
      phone: customerPhoneEl.value
    },
    items,
    subTotal: parseFloat(subTotalEl.value),
    discountPercent: parseFloat(discountPercentEl.value),
    discount: parseFloat(discountRsEl.value),
    total: parseFloat(grandTotalEl.value),
    received: parseFloat(receivedEl.value),
    balance: parseFloat(balanceEl.value)
  };
}

// ============================================
// SAVE DRAFT
// ============================================
async function saveDraft() {
  const billData = getBillData();
  
  try {
    let result;
    if (currentDraftId) {
      result = await API.saveDraft({ ...billData, _id: currentDraftId });
    } else {
      result = await API.saveDraft(billData);
      currentDraftId = result.draftId;
    }
    
    if (result.success) {
      alert("✓ Draft saved successfully!");
    }
  } catch (error) {
    console.error("Error saving draft:", error);
    alert("Error: " + (error.error || error.message || "Failed to save draft"));
  }
}

// ============================================
// SAVE FINAL BILL
// ============================================
async function saveFinalBill() {
  const billData = getBillData();
  
  if (!billData.customer.name) {
    alert("Please enter customer name");
    return;
  }
  
  if (billData.items.length === 0) {
    alert("Please add at least one item");
    return;
  }
  
  try {
    let result;
    const editingBillId = sessionStorage.getItem('editingBillId');
    
    if (editingBillId) {
      result = await API.updateBill(editingBillId, billData);
      sessionStorage.removeItem('editingBillId');
    } else {
      result = await API.saveBill(billData);
    }
    
    if (result.message) {
      alert("✓ Bill saved successfully!");
      
      if (currentDraftId) {
        await API.deleteDraft(currentDraftId);
      }
      
      if (confirm("Download PDF now?")) {
        await downloadPDF();
      }
      
      window.location.href = "welcome.html";
    }
  } catch (error) {
    console.error("Error saving bill:", error);
    alert("Error: " + (error.error || error.message || "Failed to save bill"));
  }
}
// ============================================
// REPLACE downloadPDF() in billing.js
// Optimized version using YOUR exact PDF code
// ============================================

/**
 * Download PDF - OPTIMIZED (Non-blocking)
 * Uses your existing PDF generation logic
 */
async function downloadPDF() {
  const billData = getBillData();
  
  // Create progress modal
  const modal = createProgressModal();
  document.body.appendChild(modal);
  
  try {
    // Step 1: Initialize
    updateProgressModal(modal, 10, 'Initializing PDF...');
    await delay(10);
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "pt", "a4");
    
    // Step 2: Header
    updateProgressModal(modal, 20, 'Adding header...');
    await delay(10);
    
    doc.setFontSize(16);
    doc.text("Estimated Bill", 297.5, 30, { align: "center" });
    
    doc.setFontSize(18).setFont(undefined, "bold");
    doc.text("ABC Company", 40, 60);
    doc.setFontSize(10).setFont(undefined, "normal");
    doc.text("Phone: 9825333385", 40, 75);
    
    // Step 3: Customer box
    updateProgressModal(modal, 30, 'Adding customer details...');
    await delay(10);
    
    const leftX = 40, rightX = 340, boxY = 95, boxH = 60, boxW = 515;
    doc.rect(leftX, boxY, boxW, boxH);
    doc.line(rightX, boxY, rightX, boxY + boxH);
    
    doc.setFontSize(11);
    doc.text("Bill To:", leftX + 8, boxY + 18);
    doc.setFontSize(10);
    doc.text(billData.customer.name || "-", leftX + 8, boxY + 34);
    if (billData.customer.phone) {
      doc.text(billData.customer.phone, leftX + 8, boxY + 50);
    }
    
    doc.setFontSize(11);
    doc.text("Estimate Details:", rightX + 8, boxY + 18);
    doc.setFontSize(10);
    doc.text(`No: ${billData.estimateNo}`, rightX + 8, boxY + 34);
    doc.text(`Date: ${billData.date}`, rightX + 8, boxY + 50);
    
    // Step 4: Prepare table data
    updateProgressModal(modal, 50, 'Preparing items table...');
    await delay(10);
    
    // PDF table - show adjusted price as base price (customer view)
    const tableData = billData.items.map((item, idx) => {
      // Calculate adjusted price per unit (original price + percentage)
      const adjustedPricePerUnit = item.qty > 0 ? (item.amount / item.qty) : item.price;
      
      return [
        (idx + 1).toString(),
        item.productName,
        item.qty.toString(),
        item.unit,
        `Rs. ${adjustedPricePerUnit.toFixed(2)}`,
        `Rs. ${item.amount.toFixed(2)}`
      ];
    });
    
    // Step 5: Generate table
    updateProgressModal(modal, 70, 'Generating table...');
    await delay(10);
    
    doc.autoTable({
      head: [["#", "Item name", "Quantity", "Unit", "Price/Unit(Rs)", "Amount(Rs)"]],
      body: tableData,
      startY: boxY + boxH + 20,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [60, 60, 60], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 220 },
        2: { cellWidth: 65, halign: "right" },
        3: { cellWidth: 50 },
        4: { cellWidth: 95, halign: "right" },
        5: { cellWidth: 95, halign: "right" }
      }
    });
    
    // Step 6: Add totals
    updateProgressModal(modal, 85, 'Adding totals...');
    await delay(10);
    
    let y = doc.lastAutoTable.finalY + 8;
    
    doc.setFont(undefined, "bold");
    doc.text(`Total`, 40, y + 15);
    doc.text(`Rs. ${billData.total.toFixed(2)}`, 500, y + 15, { align: "right" });
    
    y += 40;
    doc.setFont(undefined, "normal");
    doc.text(`Sub Total :`, 400, y);
    doc.text(`Rs. ${billData.subTotal.toFixed(2)}`, 575, y, { align: "right" });
    
    y += 15;
    doc.text(`Discount :`, 400, y);
    doc.text(`Rs. ${billData.discount.toFixed(2)}`, 575, y, { align: "right" });
    
    y += 15;
    doc.setFont(undefined, "bold");
    doc.text(`Total :`, 400, y);
    doc.text(`Rs. ${billData.total.toFixed(2)}`, 575, y, { align: "right" });
    
    y += 30;
    doc.setFont(undefined, "normal");
    doc.text("Invoice Amount in Words:", 40, y);
    doc.text(amountWordsEl.value, 40, y + 15);
    
    y += 40;
    doc.text("Received :", 400, y);
    doc.text(`Rs. ${billData.received.toFixed(2)}`, 575, y, { align: "right" });
    
    y += 15;
    doc.text("Balance :", 400, y);
    doc.text(`Rs. ${billData.balance.toFixed(2)}`, 575, y, { align: "right" });
    
    // Step 7: Save
    updateProgressModal(modal, 95, 'Downloading...');
    await delay(10);
    
    const filename = `${billData.estimateNo} - ${billData.customer.name || "Bill"}.pdf`;
    doc.save(filename);
    
    // Step 8: Complete
    updateProgressModal(modal, 100, 'Complete!');
    await delay(500);
    closeProgressModal(modal);
    
    // Show success notification
    showNotification('✅ PDF downloaded successfully!', 'success');
    
  } catch (error) {
    console.error('PDF generation error:', error);
    closeProgressModal(modal);
    alert('Error generating PDF: ' + error.message);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Delay helper for non-blocking async
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create progress modal UI
 */
function createProgressModal() {
  const modal = document.createElement('div');
  modal.id = 'pdfProgressModal';
  modal.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease;
    ">
      <div style="
        background: white;
        padding: 30px;
        border-radius: 12px;
        min-width: 320px;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      ">
        <h3 style="margin: 0 0 20px 0; color: #333; font-size: 18px;">📄 Generating PDF</h3>
        <div style="
          background: #f1f1f3;
          border-radius: 10px;
          height: 10px;
          overflow: hidden;
          margin-bottom: 15px;
        ">
          <div id="pdfProgressBar" style="
            background: linear-gradient(90deg, #ff6363, #ff8787);
            height: 100%;
            width: 0%;
            transition: width 0.3s ease;
          "></div>
        </div>
        <p id="pdfProgressText" style="
          margin: 0;
          color: #777;
          font-size: 14px;
        ">Starting...</p>
      </div>
    </div>
  `;
  
  // Add fade in animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  if (!document.querySelector('style[data-pdf-modal]')) {
    style.setAttribute('data-pdf-modal', 'true');
    document.head.appendChild(style);
  }
  
  return modal;
}

/**
 * Update progress modal
 */
function updateProgressModal(modal, progress, message) {
  const bar = modal.querySelector('#pdfProgressBar');
  const text = modal.querySelector('#pdfProgressText');
  
  if (bar) bar.style.width = progress + '%';
  if (text) text.textContent = message;
}

/**
 * Close progress modal
 */
function closeProgressModal(modal) {
  if (modal && modal.parentNode) {
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s';
    setTimeout(() => modal.remove(), 300);
  }
}

/**
 * Show notification helper
 */
function showNotification(message, type = 'info') {
  let notification = document.getElementById('globalNotification');
  
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'globalNotification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 25px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      animation: slideInRight 0.3s ease;
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
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
    if (!document.querySelector('style[data-notification]')) {
      style.setAttribute('data-notification', 'true');
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
  }
  
  const colors = {
    success: '#4caf50',
    error: '#f44336',
    info: '#2196f3',
    warning: '#ffc107'
  };
  
  notification.style.background = colors[type] || colors.info;
  notification.textContent = message;
  notification.style.display = 'block';
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      notification.style.display = 'none';
      notification.style.opacity = '1';
    }, 300);
  }, 3000);
}

// ============================================
// ============================================
// NUMBER TO WORDS
// ============================================
function numberToWordsIndian(num) {
  if (num === 0) return "Zero Rupees";
  
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", 
             "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", 
             "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", 
             "Seventy", "Eighty", "Ninety"];
  
  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + 
                         (n % 100 ? " and " + inWords(n % 100) : "");
    return "";
  }
  
  let s = "";
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = Math.floor(num / 100);
  const rest = num % 100;
  
  if (crore) s += inWords(crore) + " Crore ";
  if (lakh) s += inWords(lakh) + " Lakh ";
  if (thousand) s += inWords(thousand) + " Thousand ";
  if (hundred) s += a[hundred] + " Hundred ";
  if (rest) s += (s !== "" ? "and " : "") + inWords(rest) + " ";
  
  return s.trim() + " Rupees";
}

// ============================================
// CHECK FOR EDIT
// ============================================
async function checkForEdit() {
  const editDraftId = sessionStorage.getItem('editDraftId');
  const viewBillId = sessionStorage.getItem('viewBillId');
  const viewOnly = sessionStorage.getItem('viewOnly');
  
  if (editDraftId) {
    await loadDraft(editDraftId);
    sessionStorage.removeItem('editDraftId');
  } else if (viewBillId) {
    await loadBill(viewBillId);
    
    if (viewOnly === 'true') {
      disableAllInputs();
      sessionStorage.removeItem('editingBillId');
    }
    
    sessionStorage.removeItem('viewBillId');
    sessionStorage.removeItem('viewOnly');
  }
}

async function loadDraft(draftId) {
  try {
    console.log('Loading draft:', draftId);
    const draft = await API.getDraftById(draftId);
    console.log('Draft data:', draft);
    loadBillData(draft);
    currentDraftId = draftId;
  } catch (error) {
    console.error('Error loading draft:', error);
    alert('Error loading draft');
  }
}

async function loadBill(billId) {
  try {
    console.log('Loading bill:', billId);
    const bill = await API.getBillById(billId);
    console.log('Bill data:', bill);
    loadBillData(bill);
    sessionStorage.setItem('editingBillId', billId);
  } catch (error) {
    console.error('Error loading bill:', error);
    alert('Error loading bill');
  }
}

function loadBillData(data) {
  console.log('Loading bill data:', data);
  
  estimateNoEl.value = data.estimateNo || "";
  billDateEl.value = data.date || "";
  customerNameEl.value = data.customer?.name || "";
  customerPhoneEl.value = data.customer?.phone || "";
  discountPercentEl.value = data.discountPercent || 0;
  discountRsEl.value = data.discount || 0;
  receivedEl.value = data.received || 0;
  
  tbody.innerHTML = "";
  
  if (data.items && data.items.length > 0) {
    console.log('Loading items:', data.items);
    data.items.forEach(item => {
      addRow(
        item.productName || item.product || "",
        item.qty || 0,
        item.unit || "Pcs",
        item.price || 0,
        item.itemPercent || 0
      );
    });
  }
  
  computeTotals();
}

function disableAllInputs() {
  document.querySelectorAll('input, select, button').forEach(el => {
    if (el.id !== 'downloadBtn') {
      el.disabled = true;
      el.style.cursor = 'not-allowed';
      el.style.opacity = '0.6';
    }
  });
  document.querySelector('h2').textContent = '📄 View Bill (Read Only)';
}

// ============================================
// START
// ============================================
document.addEventListener("DOMContentLoaded", init);