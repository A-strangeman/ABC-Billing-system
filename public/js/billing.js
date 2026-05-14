// ============================================
// BILLING.JS
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
// ADD ROW
// ============================================
function addRow(productName = "", qty = 0, unit = "Pcs", price = 0) {
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
    
    <td class="row-total">0.00</td>
    <td><button class="del">×</button></td>
  `;
  
  tbody.appendChild(tr);
  
  const productInput = tr.querySelector(".productName");
  const qtyInput = tr.querySelector(".qty");
  const unitSelect = tr.querySelector(".unit");
  const priceInput = tr.querySelector(".price");
  
  const delBtn = tr.querySelector(".del");
  
  // Event listeners
  qtyInput.addEventListener("input", computeTotals);
  priceInput.addEventListener("input", computeTotals);
  
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
 // Replace the productInput "input" listener you just added with this:

let priceHistoryTimeout;
productInput.addEventListener("input", () => {
  clearTimeout(priceHistoryTimeout);
  const name = productInput.value.trim();
  
  if (name.length < 3) {
    priceSection.style.display = 'none';
    return;
  }

  priceHistoryTimeout = setTimeout(async () => {
    try {
      const priceHistory = await API.getPriceHistory(name);

      if (priceHistory && priceHistory.length > 0) {
        priceRow.innerHTML = priceHistory.map(ph => `
          <span class="chip price-chip" data-price="${ph.price}">
            ₹${ph.price} (${new Date(ph.date).toLocaleDateString()})
          </span>
        `).join('');

        priceSection.style.display = 'block';

        priceRow.querySelectorAll('.price-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            activeRow.querySelector('.price').value = chip.dataset.price;
            computeTotals();
          });
        });
      } else {
        priceSection.style.display = 'none';
      }
    } catch (error) {
      priceSection.style.display = 'none';
    }
  }, 400); // waits 400ms after you stop typing
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
// COMPUTE TOTALS
// ============================================
function computeTotals() {
  let subTotal = 0;
  
  tbody.querySelectorAll("tr").forEach(tr => {
    const qty = parseFloat(tr.querySelector(".qty").value) || 0;
    const price = parseFloat(tr.querySelector(".price").value) || 0;
    
    // Calculate row amount
    const rowTotal = qty * price;
    
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
  // discountPercentEl.addEventListener("input", onDiscountPercentChange);
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
      const adjustment = (currentPrice * percentValue) / 100;
      priceInput.value = (currentPrice + adjustment).toFixed(2);
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
    received: parseFloat(receivedEl.value) || 0,
    balance: parseFloat(balanceEl.value) || 0
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
  const customer = billData.customer || {};
  const selectedLanguageRaw = localStorage.getItem('abc.pdfLanguage') || localStorage.getItem('pdfLanguage') || 'en';
  const selectedLanguage = selectedLanguageRaw === 'ne' ? 'ne' : 'en';

  if (selectedLanguage === 'ne' && window.PDFGenerator?.generateNepaliBillPDF) {
    const modal = createProgressModal();
    document.body.appendChild(modal);

    try {
      await window.PDFGenerator.generateNepaliBillPDF(billData, (progress, message) => {
        updateProgressModal(modal, progress, message);
      });
      await delay(400);
      closeProgressModal(modal);
      showNotification('✅ PDF सफलतापूर्वक डाउनलोड भयो!', 'success');
      return;
    } catch (error) {
      console.error('Nepali PDF generation error:', error);
      closeProgressModal(modal);
      alert('PDF बनाउन समस्या भयो: ' + error.message);
      return;
    }
  }

  let businessName = "Shuv Labh Doors";
  let businessPhone = "9825333385";

  try {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    businessName = storedUser.organizationName || localStorage.getItem("businessName") || businessName;
    businessPhone = storedUser.mobileNo || localStorage.getItem("businessPhone") || businessPhone;
  } catch (error) {
    console.warn("Unable to read business profile from localStorage:", error);
  }
  
  // Create progress modal
  const modal = createProgressModal();
  document.body.appendChild(modal);
  
  try {
    // Step 1: Initialize
    updateProgressModal(modal, 10, 'Initializing PDF...');
    await delay(10);
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "pt", "a4");
    const colors = {
      headerNavy: [26, 26, 46],
      accentRed: [195, 57, 43],
      lightGray: [246, 247, 249],
      border: [218, 223, 229],
      successBg: [232, 244, 235],
      successText: [53, 128, 79],
      dueBg: [251, 232, 232],
      dueText: [184, 49, 49]
    };
    
    // Step 2: Header
    updateProgressModal(modal, 20, 'Adding header...');
    await delay(10);
    
    const marginX = 20;
    const contentWidth = 555;
    const topAccentY = 16;
    const headerY = topAccentY + 6;
    const headerH = 84;

    doc.setFillColor(...colors.accentRed);
    doc.rect(marginX, topAccentY, contentWidth, 6, "F");
    doc.setFillColor(...colors.headerNavy);
    doc.rect(marginX, headerY, contentWidth, headerH, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(23).setFont(undefined, "bold");
    doc.text(businessName, marginX + 18, headerY + 33);
    doc.setFontSize(11).setFont(undefined, "normal");
    doc.setTextColor(201, 207, 221);
    doc.text(`Phone: ${businessPhone}`, marginX + 18, headerY + 54);

    doc.setTextColor(244, 204, 82);
    doc.setFontSize(24).setFont(undefined, "bold");
    doc.text("ESTIMATED BILL", marginX + contentWidth - 16, headerY + 34, { align: "right" });
    doc.setFontSize(11.5).setFont(undefined, "normal");
    doc.setTextColor(201, 207, 221);
    doc.text("ESTIMATED INVOICE", marginX + contentWidth - 16, headerY + 54, { align: "right" });
    
    // Step 3: Customer box
    updateProgressModal(modal, 30, 'Adding customer details...');
    await delay(10);
    
    const leftX = 20, rightX = 408, boxY = headerY + headerH, boxW = 555;
    const customerTextWidth = rightX - leftX - 16;
    const customerNameLines = doc.splitTextToSize(customer.name || "-", customerTextWidth);
    const customerStartY = boxY + 34;
    const lineHeight = 14;
    const phoneY = customerStartY + (customerNameLines.length * lineHeight);
    const leftBottomY = customer.phone ? (phoneY + 2) : (phoneY - lineHeight + 2);
    const dynamicBoxH = Math.max(60, Math.ceil(leftBottomY - boxY + 12));

    doc.rect(leftX, boxY, boxW, dynamicBoxH);
    doc.line(rightX, boxY, rightX, boxY + dynamicBoxH);
    
    doc.setFontSize(11);
    doc.setTextColor(119, 126, 138);
    doc.text("Bill To:", leftX + 8, boxY + 18);
    doc.setFontSize(10);
    doc.setTextColor(33, 39, 49);
    doc.text(customerNameLines, leftX + 8, customerStartY);
    if (customer.phone) {
      doc.setTextColor(119, 126, 138);
      doc.text(customer.phone, leftX + 8, phoneY);
    }
    
    doc.setFontSize(11);
    doc.setTextColor(119, 126, 138);
    doc.text("Estimate Details:", rightX + 8, boxY + 18);
    doc.setFontSize(10);
    doc.setTextColor(33, 39, 49);
    doc.text(`No: ${billData.estimateNo}`, rightX + 8, boxY + 34);
    doc.text(`Date: ${billData.date}`, rightX + 8, boxY + 50);
    
    // Step 4: Prepare table data
    updateProgressModal(modal, 50, 'Preparing items table...');
    await delay(10);
    
    // PDF table
    const tableData = billData.items.map((item, idx) => {
      const qty = Number(item?.qty) || 0;
      const amount = Number(item?.amount) || 0;
      const price = Number(item?.price) || 0;
      return [
        (idx + 1).toString(),
        item?.productName || '-',
        qty.toString(),
        item?.unit || '-',
        `Rs. ${(qty > 0 ? (amount / qty) : price).toFixed(2)}`,
        `Rs. ${amount.toFixed(2)}`
      ];
    });
    
    // Step 5: Generate table
    updateProgressModal(modal, 70, 'Generating table...');
    await delay(10);
    
    doc.autoTable({
      head: [["#", "Item name", "Quantity", "Unit", "Price/Unit(Rs)", "Amount(Rs)"]],
      body: tableData,
      startY: boxY + dynamicBoxH + 20,
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

    const leftPanelW = 365;
    const rightPanelX = leftX + leftPanelW;
    const rightPanelW = boxW - leftPanelW;
    const panelH = 172;

    doc.setFillColor(...colors.lightGray);
    doc.setDrawColor(...colors.border);
    doc.rect(leftX, y, leftPanelW, panelH, "FD");
    doc.setTextColor(119, 126, 138);
    doc.setFontSize(11);
    doc.text("Amount in Words", leftX + 16, y + 22);
    doc.setTextColor(33, 39, 49);
    doc.setFontSize(12);
    doc.text(doc.splitTextToSize(amountWordsEl.value || "-", leftPanelW - 28), leftX + 16, y + 44);

    doc.setFillColor(255, 255, 255);
    doc.rect(rightPanelX, y, rightPanelW, panelH, "FD");
    doc.setDrawColor(...colors.border);
    doc.line(rightPanelX, y + 34, rightPanelX + rightPanelW, y + 34);
    doc.line(rightPanelX, y + 68, rightPanelX + rightPanelW, y + 68);
    doc.line(rightPanelX, y + 102, rightPanelX + rightPanelW, y + 102);
    doc.line(rightPanelX, y + 136, rightPanelX + rightPanelW, y + 136);

    doc.setTextColor(119, 126, 138);
    doc.setFontSize(12);
    doc.text("Sub Total", rightPanelX + 12, y + 22);
    doc.text("Discount", rightPanelX + 12, y + 56);
    doc.setTextColor(33, 39, 49);
    doc.text(`Rs. ${billData.subTotal.toFixed(2)}`, rightPanelX + rightPanelW - 12, y + 22, { align: "right" });
    doc.setTextColor(196, 55, 43);
    const discountValue = billData.discount > 0 ? `- Rs. ${billData.discount.toFixed(2)}` : `Rs. ${billData.discount.toFixed(2)}`;
    doc.text(discountValue, rightPanelX + rightPanelW - 12, y + 56, { align: "right" });

    doc.setFillColor(...colors.accentRed);
    doc.rect(rightPanelX, y + 68, rightPanelW, 34, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.text("TOTAL", rightPanelX + 12, y + 90);
    doc.text(`Rs. ${billData.total.toFixed(2)}`, rightPanelX + rightPanelW - 12, y + 90, { align: "right" });

    doc.setFillColor(...colors.successBg);
    doc.rect(rightPanelX, y + 102, rightPanelW, 34, "F");
    doc.setTextColor(...colors.successText);
    doc.setFont(undefined, "normal");
    doc.text("Received", rightPanelX + 12, y + 124);
    doc.text(`Rs. ${billData.received.toFixed(2)}`, rightPanelX + rightPanelW - 12, y + 124, { align: "right" });

    doc.setFillColor(...colors.dueBg);
    doc.rect(rightPanelX, y + 136, rightPanelW, 34, "F");
    doc.setTextColor(...colors.dueText);
    doc.setFont(undefined, "bold");
    doc.text("Balance Due", rightPanelX + 12, y + 158);
    doc.text(`Rs. ${billData.balance.toFixed(2)}`, rightPanelX + rightPanelW - 12, y + 158, { align: "right" });
    
    // Step 7: Save
    updateProgressModal(modal, 95, 'Downloading...');
    await delay(10);
    
    const filename = `${billData.estimateNo || "Bill"} - ${customer.name || "Bill"}.pdf`;
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
        item.price || 0
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