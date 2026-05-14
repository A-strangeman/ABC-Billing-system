// ============================================
// PDF-GENERATOR.JS - Optimized PDF Generation
// frontend/js/pdf-generator.js
// ============================================

/**
 * Optimized PDF Generator with async processing
 * - Non-blocking UI during generation
 * - Progress feedback
 * - Memory efficient
 */

class PDFGenerator {
  constructor() {
    this.isGenerating = false;
    this.tableStartY = 175;
  }

  _getBusinessProfile() {
    let businessName = 'Shuv Labh Doors';
    let businessPhone = '9825333385';

    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      businessName = storedUser.organizationName || localStorage.getItem('businessName') || businessName;
      businessPhone = storedUser.mobileNo || localStorage.getItem('businessPhone') || businessPhone;
    } catch (error) {
      console.warn('Unable to read business profile from localStorage:', error);
    }

    return { businessName, businessPhone };
  }

  /**
   * Generate PDF asynchronously with progress tracking
   * @param {Object} billData - Bill data to generate PDF from
   * @param {Function} onProgress - Progress callback (0-100)
   * @returns {Promise<void>}
   */
  async generateBillPDF(billData, onProgress = null) {
    if (this.isGenerating) {
      throw new Error('PDF generation already in progress');
    }

    this.isGenerating = true;

    try {
      // Show progress
      if (onProgress) onProgress(10, 'Initializing PDF...');

      // Initialize jsPDF
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF("p", "pt", "a4");

      // Header (20%)
      if (onProgress) onProgress(20, 'Adding header...');
      await this._addHeader(doc, billData);

      // Bill details box (30%)
      if (onProgress) onProgress(30, 'Adding customer details...');
      await this._addCustomerBox(doc, billData);

      // Items table (60%)
      if (onProgress) onProgress(60, 'Adding items table...');
      await this._addItemsTable(doc, billData);

      // Totals section (80%)
      if (onProgress) onProgress(80, 'Calculating totals...');
      await this._addTotalsSection(doc, billData);

      // Finalize (90%)
      if (onProgress) onProgress(90, 'Finalizing PDF...');
      
      // Small delay to ensure UI updates
      await this._delay(50);

      // Download
      if (onProgress) onProgress(95, 'Downloading...');
      const estimateNo = billData?.estimateNo || 'Bill';
      const customerName = billData?.customer?.name || billData?.customerName || 'Bill';
      const filename = `${estimateNo} - ${customerName}.pdf`;
      doc.save(filename);

      if (onProgress) onProgress(100, 'Complete!');

    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Add header section
   */
  async _addHeader(doc, billData) {
    const { businessName, businessPhone } = this._getBusinessProfile();

    doc.setFontSize(16);
    doc.text("Estimated Bill", 297.5, 30, { align: "center" });
    
    doc.setFontSize(18).setFont(undefined, "bold");
    doc.text(businessName, 40, 60);
    doc.setFontSize(10).setFont(undefined, "normal");
    doc.text(`Phone: ${businessPhone}`, 40, 75);
  }

  /**
   * Add customer details box
   */
  async _addCustomerBox(doc, billData) {
    const customer = billData?.customer || {};
    const leftX = 40, rightX = 340, boxY = 95, boxW = 515;
    const customerTextWidth = rightX - leftX - 16;
    const customerNameLines = doc.splitTextToSize(customer.name || '-', customerTextWidth);
    const customerStartY = boxY + 34;
    const lineHeight = 14;
    const phoneY = customerStartY + (customerNameLines.length * lineHeight);
    const leftBottomY = customer.phone ? (phoneY + 2) : (phoneY - lineHeight + 2);
    const dynamicBoxH = Math.max(60, Math.ceil(leftBottomY - boxY + 12));
    
    // Draw box
    doc.rect(leftX, boxY, boxW, dynamicBoxH);
    doc.line(rightX, boxY, rightX, boxY + dynamicBoxH);
    
    // Left side - Customer info
    doc.setFontSize(11);
    doc.text("Bill To:", leftX + 8, boxY + 18);
    doc.setFontSize(10);
    doc.text(customerNameLines, leftX + 8, customerStartY);
    if (customer.phone) {
      doc.text(customer.phone, leftX + 8, phoneY);
    }
    
    // Right side - Bill details
    doc.setFontSize(11);
    doc.text("Estimate Details:", rightX + 8, boxY + 18);
    doc.setFontSize(10);
    doc.text(`No: ${billData.estimateNo}`, rightX + 8, boxY + 34);
    doc.text(`Date: ${billData.date}`, rightX + 8, boxY + 50);

    this.tableStartY = boxY + dynamicBoxH + 20;
  }

  /**
   * Add items table (optimized for large tables)
   */
  async _addItemsTable(doc, billData) {
    // Prepare table data in chunks to avoid blocking
    const tableData = [];
    const chunkSize = 50; // Process 50 items at a time
    
    for (let i = 0; i < billData.items.length; i += chunkSize) {
      const chunk = billData.items.slice(i, i + chunkSize);
      
      chunk.forEach((item, idx) => {
        const qty = Number(item?.qty) || 0;
        const amount = Number(item?.amount) || 0;
        const price = Number(item?.price) || 0;
        // Calculate adjusted price per unit
        const adjustedPricePerUnit = qty > 0 ? (amount / qty) : price;
        
        tableData.push([
          (i + idx + 1).toString(),
          item?.productName || '-',
          qty.toString(),
          item?.unit || '-',
          `Rs. ${adjustedPricePerUnit.toFixed(2)}`,
          `Rs. ${amount.toFixed(2)}`
        ]);
      });

      // Yield to browser every chunk
      if (i + chunkSize < billData.items.length) {
        await this._delay(10);
      }
    }

    // Generate table
    doc.autoTable({
      head: [["#", "Item name", "Quantity", "Unit", "Price/Unit(Rs)", "Amount(Rs)"]],
      body: tableData,
      startY: this.tableStartY,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [60, 60, 60], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 200 },
        2: { cellWidth: 60, halign: "right" },
        3: { cellWidth: 45 },
        4: { cellWidth: 90, halign: "right" },
        5: { cellWidth: 90, halign: "right" }
      }
    });
  }

  /**
   * Add totals and payment section
   */
  async _addTotalsSection(doc, billData) {
    let y = doc.lastAutoTable.finalY + 8;
    
    // Grand total highlight
    doc.setFont(undefined, "bold");
    doc.text(`Total`, 40, y + 15);
    doc.text(`Rs. ${billData.total.toFixed(2)}`, 500, y + 15, { align: "right" });
    
    y += 40;
    doc.setFont(undefined, "normal");
    
    // Breakdown
    doc.text(`Sub Total :`, 400, y);
    doc.text(`Rs. ${billData.subTotal.toFixed(2)}`, 575, y, { align: "right" });
    
    y += 15;
    doc.text(`Discount :`, 400, y);
    doc.text(`Rs. ${billData.discount.toFixed(2)}`, 575, y, { align: "right" });
    
    y += 15;
    doc.setFont(undefined, "bold");
    doc.text(`Total :`, 400, y);
    doc.text(`Rs. ${billData.total.toFixed(2)}`, 575, y, { align: "right" });
    
    // Amount in words
    y += 30;
    doc.setFont(undefined, "normal");
    doc.text("Invoice Amount in Words:", 40, y);
    const words = this._numberToWordsIndian(Math.round(billData.total)) + " only";
    doc.text(words, 40, y + 15);
    
    // Payment details
    y += 40;
    doc.text("Received :", 400, y);
    doc.text(`Rs. ${billData.received.toFixed(2)}`, 575, y, { align: "right" });
    
    y += 15;
    doc.text("Balance :", 400, y);
    doc.text(`Rs. ${billData.balance.toFixed(2)}`, 575, y, { align: "right" });
  }

  /**
   * Convert number to Indian words
   */
  _numberToWordsIndian(num) {
    if (num === 0) return "Zero Rupees";
    
    const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", 
               "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", 
               "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", 
               "Seventy", "Eighty", "Ninety"];
    
    const inWords = (n) => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
      if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + 
                           (n % 100 ? " and " + inWords(n % 100) : "");
      return "";
    };
    
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

  _numberToWordsNepali(num) {
    const value = Number(num);
    if (!Number.isFinite(value) || value === 0) return 'शून्य रुपैयाँ';

    const ones = [
      '', 'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात',
      'आठ', 'नौ', 'दस', 'एघार', 'बाह्र', 'तेह्र', 'चौध',
      'पन्ध्र', 'सोह्र', 'सत्र', 'अठार', 'उन्नाइस'
    ];
    const tens = ['', '', 'बीस', 'तीस', 'चालीस', 'पचास', 'साठी', 'सत्तरी', 'असी', 'नब्बे'];

    const inWords = (n) => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) {
        return `${tens[Math.floor(n / 10)]}${n % 10 !== 0 ? ` ${ones[n % 10]}` : ''}`.trim();
      }
      if (n < 1000) {
        return `${ones[Math.floor(n / 100)]} सय${n % 100 !== 0 ? ` ${inWords(n % 100)}` : ''}`.trim();
      }
      return '';
    };

    let remaining = Math.floor(Math.abs(value));
    let result = '';

    const crore = Math.floor(remaining / 10000000);
    remaining %= 10000000;
    const lakh = Math.floor(remaining / 100000);
    remaining %= 100000;
    const thousand = Math.floor(remaining / 1000);
    remaining %= 1000;

    if (crore) result += `${inWords(crore)} करोड `;
    if (lakh) result += `${inWords(lakh)} लाख `;
    if (thousand) result += `${inWords(thousand)} हजार `;
    if (remaining) result += inWords(remaining);

    return `${result.trim()} रुपैयाँ`;
  }

  _toNepaliNumber(value) {
    return String(value ?? '').replace(/[0-9]/g, (d) => '०१२३४५६७८९'[d]);
  }

  _formatNepaliDate(dateStr) {
    if (!dateStr) return '-';
    return this._toNepaliNumber(dateStr);
  }

  _buildNepaliHtmlBill(billData, businessName, businessPhone) {
    const customer = billData?.customer || {};
    const total = Number(billData?.total) || 0;
    const subTotal = Number(billData?.subTotal) || 0;
    const discount = Number(billData?.discount) || 0;
    const received = Number(billData?.received) || 0;
    const balance = Number(billData?.balance) || 0;
    const amtWords = `${this._numberToWordsNepali(Math.round(total))} मात्र`;
    const discountDisplay = discount > 0 ? `- ${rs(discount)}` : rs(discount);
    const balanceRowClass = balance > 0 ? 'balance-row' : 'balance-zero-row';
    const rightFooterNote = 'कम्प्युटरबाट उत्पन्न बिल — हस्ताक्षर आवश्यक छैन';

    const rs = (val) => {
      const n = Number(val);
      const safe = Number.isFinite(n) ? n : 0;
      return `रु ${this._toNepaliNumber(safe.toFixed(2))}`;
    };

    const itemRows = (Array.isArray(billData?.items) ? billData.items : []).map((item, idx) => {
      const qty = Number(item?.qty) || 0;
      const amount = Number(item?.amount) || 0;
      const price = Number(item?.price) || 0;
      const rate = qty > 0 ? (amount / qty) : price;

      return `
        <tr>
          <td class="center">${this._toNepaliNumber(idx + 1)}</td>
          <td class="item-name">${item?.productName || '-'}</td>
          <td class="right">${this._toNepaliNumber(qty)}</td>
          <td class="center">${item?.unit || '-'}</td>
          <td class="right">${rs(rate)}</td>
          <td class="right">${rs(amount)}</td>
        </tr>`;
    }).join('');

    const paymentStatus = balance <= 0 ? 'चुक्ता' : 'बाँकी';
    const statusClass = balance <= 0 ? 'paid' : 'due';

    return `<!DOCTYPE html>
<html lang="ne">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Devanagari', sans-serif;
    font-size: 11pt;
    color: #111827;
    font-weight: 500;
    background: #fff;
    width: 794px;
  }
  .accent-bar { background: #c3392b; height: 6px; }
  .header {
    background: #1a1a2e;
    color: #fff;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 24px 14px;
  }
  .header-left .biz-name { font-size: 18pt; font-weight: 700; }
  .header-left .biz-phone { font-size: 10pt; color: #e7ebf7; margin-top: 4px; font-weight: 600; }
  .header-right .bill-title { font-size: 19pt; font-weight: 700; color: #f4cc52; text-align: right; }
  .header-right .bill-sub { font-size: 10pt; color: #e7ebf7; text-align: right; margin-top: 3px; font-weight: 600; }
  .info-box { display: flex; border: 1px solid #dae0e9; border-top: none; }
  .info-left { flex: 1; padding: 12px 14px; border-right: 1px solid #dae0e9; }
  .info-right { width: 220px; padding: 9px 14px; }
  .info-label { font-size: 9.5pt; color: #374151; margin-bottom: 4px; font-weight: 600; }
  .info-value { font-size: 11pt; font-weight: 700; color: #111827; }
  .info-sub { font-size: 10pt; color: #374151; margin-top: 2px; font-weight: 600; }
  .info-row { display: flex; justify-content: space-between; align-items: center; min-height: 30px; margin-bottom: 0; }
  .info-row.status-row { min-height: 32px; }
  .info-row.status-row .info-label { display: inline-flex; align-items: center; height: 100%; margin: 0; line-height: 1.1; }
  .status-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    min-width: 84px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 9.5pt;
    font-weight: 600;
    line-height: 1.05;
    margin: 0;
    margin-top: 0;
  }
  .status-badge.paid { background: #e8f4eb; color: #35804f; }
  .status-badge.due { background: #fbe8e8; color: #b83131; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 10pt; table-layout: fixed; border: 1px solid #c9d1dc; }
  thead tr { background: #3c3c3c; color: #fff; }
  thead th { padding: 8px 7px; text-align: left; font-weight: 700; font-size: 10pt; border: 1px solid #c9d1dc; }
  tbody tr { border-bottom: 1px solid #e8eaf0; }
  tbody tr:nth-child(even) { background: #f8f9fc; }
  td { padding: 7px 7px; color: #111827; font-weight: 600; border: 1px solid #c9d1dc; }
  th.item-name, td.item-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .end-marker {
    margin: 6px 0 8px;
    text-align: center;
    color: #8b95a7;
    font-size: 11pt;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .totals-section { display: flex; margin-top: 10px; border: 1px solid #dae0e9; }
  .words-panel { flex: 1; background: #f6f7f9; padding: 10px 12px; border-right: 1px solid #dae0e9; min-height: 155px; display: flex; flex-direction: column; }
  .words-label { font-size: 10pt; color: #374151; margin-bottom: 6px; font-weight: 600; }
  .words-value { font-size: 12pt; font-weight: 700; line-height: 1.35; color: #111827; }
  .amounts-panel { width: 230px; }
  .amt-row {
    display: flex;
    justify-content: space-between;
    padding: 7px 12px;
    border-bottom: 1px solid #dae0e9;
    font-size: 10.5pt;
    color: #111827;
    font-weight: 700;
  }
  .amt-row.total-row { background: #c3392b; color: #fff; font-weight: 700; font-size: 11pt; }
  .amt-row.received-row { background: #e8f4eb; color: #35804f; }
  .amt-row.balance-row { background: #fbe8e8; color: #b83131; font-weight: 700; }
  .amt-row.balance-zero-row { background: #e8f4eb; color: #35804f; font-weight: 700; }
  .amt-label { color: #111827; font-weight: 700; }
  .amt-value { color: #111827; font-weight: 800; }
  .signature-section { display: flex; justify-content: flex-start; margin-top: auto; padding: 8px 0 0; }
  .signature-box { text-align: center; }
  .sig-line { width: 170px; border-top: 1px solid #9ca3af; margin-bottom: 4px; }
  .sig-label { font-size: 10pt; color: #6b7280; font-weight: 600; }
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 9.5pt;
    color: #374151;
    font-weight: 600;
    margin-top: 0;
    padding-top: 8px;
    border-top: 1px solid #eee;
  }
  .footer-left { color: #374151; }
  .footer-right { color: #6b7280; font-size: 8.8pt; text-align: right; }
</style>
</head>
<body>
<div class="accent-bar"></div>
<div class="header">
  <div class="header-left">
    <div class="biz-name">${businessName}</div>
    <div class="biz-phone">फोन नं.: ${businessPhone}</div>
  </div>
  <div class="header-right">
    <div class="bill-title">अनुमानित बिल</div>
    <div class="bill-sub">अनुमानित चलान</div>
  </div>
</div>
<div class="info-box">
  <div class="info-left">
    <div class="info-label">बिल प्राप्तकर्ता</div>
    <div class="info-value">${customer?.name || '-'}</div>
    ${customer?.phone ? `<div class="info-sub">${customer.phone}</div>` : ''}
  </div>
  <div class="info-right">
    <div class="info-row"><span class="info-label">बिल नं.</span><span>${this._toNepaliNumber(billData?.estimateNo || '-')}</span></div>
    <div class="info-row"><span class="info-label">मिति</span><span>${this._formatNepaliDate(billData?.date)}</span></div>
    <div class="info-row status-row"><span class="info-label">भुक्तानी स्थिति</span><span class="status-badge ${statusClass}">${paymentStatus}</span></div>
  </div>
</div>
<table>
  <thead>
    <tr>
      <th class="center" style="width:40px">क्र.सं.</th>
      <th class="item-name">सामानको नाम</th>
      <th class="right" style="width:70px">मात्रा</th>
      <th class="center" style="width:55px">एकाइ</th>
      <th class="right" style="width:105px">दर/एकाइ</th>
      <th class="right" style="width:110px">रकम</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>
<div class="end-marker">-- अन्त --</div>
<div class="totals-section">
  <div class="words-panel">
    <div class="words-label">शब्दमा रकम</div>
    <div class="words-value">${amtWords}</div>
  </div>
  <div class="amounts-panel">
    <div class="amt-row"><span class="amt-label">जम्मा</span><span class="amt-value">${rs(subTotal)}</span></div>
    <div class="amt-row"><span class="amt-label">छुट</span><span class="amt-value">${discountDisplay}</span></div>
    <div class="amt-row total-row"><span class="amt-label">कुल जम्मा</span><span class="amt-value">${rs(total)}</span></div>
    <div class="amt-row received-row"><span class="amt-label">प्राप्त</span><span class="amt-value">${rs(received)}</span></div>
    <div class="amt-row ${balanceRowClass}"><span class="amt-label">बाँकी रकम</span><span class="amt-value">${rs(balance)}</span></div>
  </div>
</div>
<div class="signature-section">
  <div class="signature-box">
    <div class="sig-line"></div>
    <div class="sig-label">विक्रेताको दस्तखत</div>
  </div>
</div>
<div class="footer">
  <span class="footer-left">धन्यवाद! पुनः व्यापार गर्नुहोला।</span>
  <span class="footer-right">${rightFooterNote}</span>
</div>
</body>
</html>`;
  }

  async generateNepaliBillPDF(billData, onProgress = null) {
    if (this.isGenerating) {
      throw new Error('PDF generation already in progress');
    }

    if (typeof window.html2canvas !== 'function') {
      throw new Error('html2canvas is missing. Please include the html2canvas CDN script.');
    }

    this.isGenerating = true;
    let container = null;

    try {
      if (onProgress) onProgress(10, 'बिल तयार गर्दैछ...');

      const { businessName, businessPhone } = this._getBusinessProfile();
      container = document.createElement('div');
      container.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 794px; background: #fff; z-index: -1;';
      container.innerHTML = this._buildNepaliHtmlBill(billData, businessName, businessPhone);
      document.body.appendChild(container);

      if (onProgress) onProgress(30, 'फन्ट लोड गर्दैछ...');
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await this._delay(200);

      if (onProgress) onProgress(55, 'पृष्ठ प्रशोधन गर्दैछ...');
      const canvas = await window.html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
        container = null;
      }

      if (onProgress) onProgress(80, 'PDF बनाउँदैछ...');

      const { jsPDF } = window.jspdf;
      const imgData = canvas.toDataURL('image/png');
      const pdfW = 210;
      const pdfH = (canvas.height * pdfW) / canvas.width;

      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [pdfW, Math.max(pdfH, 297)]
      });

      doc.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);

      if (onProgress) onProgress(95, 'डाउनलोड गर्दैछ...');
      const customerName = billData?.customer?.name || billData?.customerName || 'Bill';
      const filename = `${billData?.estimateNo || 'Bill'} - ${customerName}.pdf`;
      doc.save(filename);

      if (onProgress) onProgress(100, 'सम्पन्न!');
    } finally {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      this.isGenerating = false;
    }
  }

  /**
   * Delay helper for async processing
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
window.PDFGenerator = new PDFGenerator();