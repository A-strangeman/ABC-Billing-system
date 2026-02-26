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
      const filename = `${billData.estimateNo} - ${billData.customer.name || "Bill"}.pdf`;
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
    doc.setFontSize(16);
    doc.text("Estimated Bill", 297.5, 30, { align: "center" });
    
    doc.setFontSize(18).setFont(undefined, "bold");
    doc.text("ABC Company", 40, 60);
    doc.setFontSize(10).setFont(undefined, "normal");
    doc.text("Phone: 9825333385", 40, 75);
  }

  /**
   * Add customer details box
   */
  async _addCustomerBox(doc, billData) {
    const leftX = 40, rightX = 340, boxY = 95, boxH = 60, boxW = 515;
    
    // Draw box
    doc.rect(leftX, boxY, boxW, boxH);
    doc.line(rightX, boxY, rightX, boxY + boxH);
    
    // Left side - Customer info
    doc.setFontSize(11);
    doc.text("Bill To:", leftX + 8, boxY + 18);
    doc.setFontSize(10);
    doc.text(billData.customer.name || "-", leftX + 8, boxY + 34);
    if (billData.customer.phone) {
      doc.text(billData.customer.phone, leftX + 8, boxY + 50);
    }
    
    // Right side - Bill details
    doc.setFontSize(11);
    doc.text("Estimate Details:", rightX + 8, boxY + 18);
    doc.setFontSize(10);
    doc.text(`No: ${billData.estimateNo}`, rightX + 8, boxY + 34);
    doc.text(`Date: ${billData.date}`, rightX + 8, boxY + 50);
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
        // Calculate adjusted price per unit
        const adjustedPricePerUnit = item.qty > 0 
          ? (item.amount / item.qty) 
          : item.price;
        
        tableData.push([
          (i + idx + 1).toString(),
          item.productName,
          item.qty.toString(),
          item.unit,
          `Rs. ${adjustedPricePerUnit.toFixed(2)}`,
          `Rs. ${item.amount.toFixed(2)}`
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
      startY: 175,
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

  /**
   * Delay helper for async processing
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
window.PDFGenerator = new PDFGenerator();