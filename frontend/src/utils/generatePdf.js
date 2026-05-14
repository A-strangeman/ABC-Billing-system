import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import nepaliFontUrl from '../assets/fonts/NotoSansDevanagari-Regular.ttf';

const TRANSLATIONS = {
  en: {
    zeroRupees: 'Zero Rupees',
    crore: 'Crore',
    lakh: 'Lakh',
    thousand: 'Thousand',
    hundred: 'Hundred',
    and: 'and',
    rupees: 'Rupees',
    only: 'only',
    estimatedBill: 'ESTIMATED BILL',
    invoiceNo: 'Invoice No',
    date: 'Date',
    billTo: 'BILL TO',
    paymentStatus: 'PAYMENT STATUS',
    received: 'RECEIVED',
    balance: 'BALANCE',
    paid: 'Paid',
    partiallyPaid: 'Partially Paid',
    unpaid: 'Unpaid',
    itemName: 'ITEM NAME',
    quantity: 'QUANTITY',
    unit: 'UNIT',
    pricePerUnit: 'PRICE / UNIT',
    amount: 'AMOUNT',
    invoiceAmountInWords: 'INVOICE AMOUNT IN WORDS',
    subTotal: 'Sub Total',
    discount: 'Discount',
    total: 'TOTAL',
    grandTotal: 'TOTAL',
    balanceDue: 'BALANCE DUE',
    invoiceSubtitle: 'ESTIMATED INVOICE',
    billRecipient: 'Bill Recipient',
    phoneLabel: 'Phone',
    signature: 'Signature',
    authorizedSignatory: 'Authorized Signature',
    thankYou: 'Thank you! Visit again.',
    computerGenerated: 'Computer generated bill',
    fallbackCompany: 'ABC Company',
    fallbackCustomer: 'Cash',
    fallbackBill: 'Bill'
  },
  ne: {
    zeroRupees: 'शून्य रुपैयाँ',
    crore: 'करोड',
    lakh: 'लाख',
    thousand: 'हजार',
    hundred: 'सय',
    and: 'र',
    rupees: 'रुपैयाँ',
    only: 'मात्र',
    estimatedBill: 'अनुमानित बिल',
    invoiceNo: 'बिल नं.',
    date: 'मिति',
    billTo: 'ग्राहक',
    paymentStatus: 'भुक्तानी स्थिति',
    received: 'प्राप्त',
    balance: 'बाँकी',
    paid: 'भुक्तानी भयो',
    partiallyPaid: 'आंशिक भुक्तानी',
    unpaid: 'भुक्तानी बाँकी',
    itemName: 'सामानको नाम',
    quantity: 'मात्रा',
    unit: 'एकाइ',
    pricePerUnit: 'दर/एकाइ',
    amount: 'रकम',
    invoiceAmountInWords: 'शब्दमा रकम',
    subTotal: 'जम्मा',
    discount: 'छुट',
    total: 'कुल',
    grandTotal: 'कुल जम्मा',
    balanceDue: 'बाँकी रकम',
    invoiceSubtitle: 'अनुमानित चलान',
    billRecipient: 'बिल प्राप्तकर्ता',
    phoneLabel: 'फोन नं.',
    signature: 'हस्ताक्षर',
    authorizedSignatory: 'बिक्रेताको दस्तखत',
    thankYou: 'धन्यवाद! पुनः व्यापार गर्नुहोला।',
    computerGenerated: 'कम्प्युटरबाट उत्पन्न गरिएको बिल',
    fallbackCompany: 'ABC Company',
    fallbackCustomer: 'नगद',
    fallbackBill: 'बिल'
  }
};

const resolveLanguage = (settings = {}) => (settings?.language === 'ne' ? 'ne' : 'en');

const getText = (language) => TRANSLATIONS[language] || TRANSLATIONS.en;

const formatNumberByLanguage = (value, language) => {
  const amount = Number(value) || 0;
  return language === 'ne'
    ? amount.toLocaleString('ne-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDateByLanguage = (value, language) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return language === 'ne'
    ? parsed.toLocaleDateString('ne-NP')
    : parsed.toLocaleDateString('en-IN');
};

const NEPALI_ONES = [
  'शून्य', 'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात', 'आठ', 'नौ',
  'दस', 'एघार', 'बाह्र', 'तेह्र', 'चौध', 'पन्ध्र', 'सोह्र', 'सत्र', 'अठार', 'उन्नाइस'
];

const NEPALI_TENS = ['', '', 'बीस', 'तीस', 'चालीस', 'पचास', 'साठी', 'सत्तरी', 'असी', 'नब्बे'];

const nepaliInWords = (n) => {
  if (n < 20) return NEPALI_ONES[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const unit = n % 10;
    return `${NEPALI_TENS[tens]}${unit ? ` ${NEPALI_ONES[unit]}` : ''}`.trim();
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    return `${NEPALI_ONES[hundreds]} सय${rest ? ` ${nepaliInWords(rest)}` : ''}`.trim();
  }
  return '';
};

let nepaliFontBase64 = null;
let nepaliFontReady = false;

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const ensureNepaliFont = async (doc) => {
  try {
    if (!nepaliFontBase64) {
      const response = await fetch(nepaliFontUrl);
      if (!response.ok) {
        throw new Error(`Font fetch failed with status ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      nepaliFontBase64 = arrayBufferToBase64(buffer);
    }

    doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', nepaliFontBase64);
    doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'normal');
    doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'bold');
    doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'italic');
    doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'bolditalic');
    nepaliFontReady = true;
    return true;
  } catch (error) {
    nepaliFontReady = false;
    console.warn('Nepali font load failed, falling back to default font:', error);
    return false;
  }
};

const setPdfFontForText = (doc, language, text, style = 'normal') => {
  if (language !== 'ne' || !nepaliFontReady) {
    doc.setFont('helvetica', style);
    return;
  }

  const value = String(text ?? '');
  const hasDevanagari = /[\u0900-\u097F]/.test(value);
  if (!hasDevanagari) {
    doc.setFont('helvetica', style);
    return;
  }

  // jsPDF shaping for Devanagari is more stable in normal style than synthetic bold/italic.
  doc.setFont('NotoSansDevanagari', 'normal');
};

const drawPdfText = (doc, language, text, x, y, options = undefined, style = 'normal') => {
  setPdfFontForText(doc, language, text, style);
  if (options) {
    doc.text(String(text ?? ''), x, y, options);
    return;
  }
  doc.text(String(text ?? ''), x, y);
};

// Convert number to Indian words
const numberToWordsIndian = (num, language = 'en') => {
  const text = getText(language);

  if (num === 0) return text.zeroRupees;
  
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", 
             "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", 
             "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", 
             "Seventy", "Eighty", "Ninety"];
  
  const inWords = (n) => {
    if (language === 'ne') return nepaliInWords(n);
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
  
  if (crore) s += inWords(crore) + ` ${text.crore} `;
  if (lakh) s += inWords(lakh) + ` ${text.lakh} `;
  if (thousand) s += inWords(thousand) + ` ${text.thousand} `;
  if (hundred) s += inWords(hundred) + ` ${text.hundred} `;
  if (rest) s += (s !== "" ? `${text.and} ` : "") + inWords(rest) + " ";
  
  return `${s.trim()} ${text.rupees}`.trim();
};

const formatCurrency = (value, language = 'en') => {
  return language === 'ne'
    ? `रु ${formatNumberByLanguage(value, language)}`
    : `Rs. ${formatNumberByLanguage(value, language)}`;
};

const formatOrganizationLines = (value) => {
  const cleaned = String(value || getText('en').fallbackCompany)
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  const words = cleaned.split(' ');

  if (words.length <= 3) {
    return [cleaned];
  }

  const splitIndex = Math.ceil(words.length / 2);
  return [words.slice(0, splitIndex).join(' '), words.slice(splitIndex).join(' ')];
};

const pickFirstText = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const toFiniteNumber = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
};

const normalizeItems = (items = []) => {
  return (Array.isArray(items) ? items : [])
    .map((item = {}) => {
      const productName = pickFirstText(
        item.productName,
        item.product,
        item.name,
        item.itemName,
        item.description
      ) || '-';

      const qty = toFiniteNumber(item.qty, item.quantity, item.pieces, 0);
      const unit = pickFirstText(item.unit, item.uom, item.measurementUnit) || '-';
      const price = toFiniteNumber(item.price, item.rate, item.unitPrice, 0);
      const amount = toFiniteNumber(item.amount, item.total, qty * price);

      return {
        productName,
        qty,
        unit,
        price,
        amount
      };
    })
    .filter((item) => item.productName !== '-' || item.qty > 0 || item.amount > 0);
};

const normalizeBillData = (billData = {}, t) => {
  const customer = billData?.customer || {};
  const normalizedItems = normalizeItems(billData?.items);

  const computedSubTotal = normalizedItems.reduce((sum, item) => sum + toFiniteNumber(item.amount), 0);
  const discount = toFiniteNumber(billData?.discount, billData?.discountRs, 0);
  const subTotal = toFiniteNumber(billData?.subTotal, computedSubTotal);
  const total = toFiniteNumber(billData?.total, subTotal - discount);
  const received = toFiniteNumber(billData?.received, billData?.paid, billData?.receivedAmount, 0);
  const balance = toFiniteNumber(billData?.balance, billData?.due, total - received);

  const customerName = pickFirstText(
    customer?.name,
    customer?.customerName,
    billData?.customerName,
    customer?.phone,
    customer?.mobile,
    billData?.phone,
    t.fallbackCustomer
  );

  const customerPhone = pickFirstText(
    customer?.phone,
    customer?.mobile,
    billData?.phone,
    billData?.mobile
  );

  return {
    estimateNo: pickFirstText(billData?.estimateNo, billData?.invoiceNo, billData?.billNo, '-') || '-',
    date: billData?.date || billData?.createdAt || billData?.updatedAt || new Date().toISOString(),
    customerName,
    customerPhone,
    items: normalizedItems,
    subTotal,
    discount,
    total,
    received,
    balance
  };
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const toNepaliDigits = (value) => String(value ?? '').replace(/[0-9]/g, (d) => '०१२३४५६७८९'[d]);

const createNepaliHtmlTemplate = (normalizedBill, profile, t) => {
  const rowsHtml = normalizedBill.items.map((item, idx) => {
    const qty = Number(item.qty) || 0;
    const amount = Number(item.amount) || 0;
    const pricePerUnit = qty > 0 ? amount / qty : (Number(item.price) || 0);
    return `
      <tr>
        <td class="center">${toNepaliDigits(idx + 1)}</td>
        <td class="item-name">${escapeHtml(item.productName)}</td>
        <td class="right">${toNepaliDigits(qty)}</td>
        <td class="center">${escapeHtml(item.unit)}</td>
        <td class="right">रु ${toNepaliDigits(pricePerUnit.toFixed(2))}</td>
        <td class="right">रु ${toNepaliDigits(amount.toFixed(2))}</td>
      </tr>`;
  }).join('');

  const orgName = escapeHtml(profile.organizationName || profile.businessName || t.fallbackCompany);
  const orgAddress = escapeHtml(profile.address || '');
  const orgPhone = escapeHtml(profile.mobileNo || '-');
  const customerName = escapeHtml(normalizedBill.customerName || '-');
  const customerPhone = normalizedBill.customerPhone ? `<div class="sub">${escapeHtml(normalizedBill.customerPhone)}</div>` : '';
  const total = Number(normalizedBill.total) || 0;
  const discount = Number(normalizedBill.discount) || 0;
  const balance = Number(normalizedBill.balance) || 0;
  const words = `${numberToWordsIndian(Math.round(total), 'ne')} ${t.only}`;
  const paymentStatus = normalizedBill.balance <= 0
    ? 'चुक्ता'
    : (normalizedBill.received > 0 ? 'आंशिक' : 'बाँकी');
  const paymentStatusClass = normalizedBill.balance <= 0
    ? 'status-paid'
    : (normalizedBill.received > 0 ? 'status-partial' : 'status-due');
  const rightFooterNote = 'कम्प्युटरबाट उत्पन्न बिल — हस्ताक्षर आवश्यक छैन';
  const discountDisplay = discount > 0
    ? `- रु ${toNepaliDigits(discount.toFixed(2))}`
    : `रु ${toNepaliDigits(discount.toFixed(2))}`;
  const balanceRowClass = balance > 0 ? 'bal' : 'zero-bal';

  return `<!doctype html>
<html lang="ne">
<head>
<meta charset="utf-8" />
<style>
@font-face { font-family: 'NotoNepali'; src: url('${nepaliFontUrl}') format('truetype'); font-display: swap; }
* { box-sizing: border-box; }
body { margin:0; width:794px; background:#fff; color:#212731; font-family:'NotoNepali', sans-serif; }
body { font-weight: 500; color:#111827; }
.sheet{margin:10px;border:1px solid #d7dde7;border-radius:10px;overflow:hidden;background:#fff;box-shadow:0 2px 8px rgba(15,23,42,.06)}
.accent{height:6px;background:#c3392b}.header{background:#161834;color:#fff;display:flex;justify-content:space-between;padding:16px 22px}
.title{font-size:20px;font-weight:700}.sub{font-size:11px;color:#c9cfdd}.gold{color:#f4cc52;text-align:right;font-size:22px;font-weight:700}
.meta{display:flex;border-top:1px solid #d7dde7;border-bottom:1px solid #d7dde7}.left{flex:1;padding:12px 14px;border-right:1px solid #d7dde7}.right{width:240px;padding:9px 14px}
.label{font-size:11px;color:#374151;font-weight:600}.value{font-size:14px;font-weight:700;color:#111827}.row{display:flex;justify-content:space-between;align-items:center;height:30px;margin:0;color:#111827;font-weight:600}
.status-row{height:32px;align-items:center}
.status-row .label{display:inline-flex;align-items:center;height:100%;margin:0;line-height:1.1}
.status-badge{display:inline-flex;align-items:center;justify-content:center;align-self:center;min-width:84px;padding:3px 10px;border-radius:999px;font-size:10.5px;font-weight:700;line-height:1.05;letter-spacing:.01em;margin:0}
.status-paid{background:#e7f5ec;color:#21663f}
.status-partial{background:#fff1c7;color:#7a5800}
.status-due{background:#fdeec5;color:#7a5800}
table{width:100%;border-collapse:collapse;margin-top:10px;table-layout:fixed;border-top:1px solid #c9d1dc;border-bottom:1px solid #c9d1dc}thead tr{background:#3c3c3c;color:#fff}th,td{padding:7px;border:1px solid #c9d1dc;font-size:11px}
.center{text-align:center}.right{text-align:right}td{color:#111827;font-weight:600}th{font-weight:700}.summary{display:flex;margin-top:8px;border-top:1px solid #2f3643;border-bottom:1px solid #d7dde7}.words{flex:1;background:#f6f7f9;padding:10px 12px;display:flex;flex-direction:column;min-height:155px}.totals{width:250px;border-left:1px solid #d7dde7}
.item-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.end-marker{margin:6px 0 8px;text-align:center;color:#8b95a7;font-size:12px;font-weight:700;letter-spacing:.02em}
.totrow{display:flex;justify-content:space-between;padding:7px 12px;border-bottom:1px solid #dae0e9;color:#111827;font-weight:700;font-size:11px}.totrow.total{background:#c3392b;color:#fff;font-weight:700}
.totrow.recv{background:#e8f4eb;color:#35804f}.totrow.bal{background:#fbe8e8;color:#b83131;font-weight:700}
.totrow.zero-bal{background:#e8f4eb;color:#35804f;font-weight:700}
.sign{display:flex;justify-content:flex-start;margin-top:auto;padding-top:8px}.sign-box{min-width:170px;text-align:center}
.sign-label{font-size:10.5px;color:#374151;font-weight:700;text-align:left;margin-bottom:10px}
.sign-line{border-top:1px solid #9ca3af;height:1px;width:170px}
.sign-sub{margin-top:5px;font-size:10px;color:#6b7280;font-weight:600}
.foot{margin-top:0;padding:8px 12px;border-top:1px solid #d7dde7;color:#7d8595;font-size:9.5px;background:#fafbfc;display:flex;align-items:center;justify-content:space-between;gap:8px}
.foot-left{color:#374151;font-size:10px;font-weight:600}
.foot-right{color:#6b7280;font-size:9.5px;font-weight:600;text-align:right}
.sub{color:#e7ebf7;font-weight:600}.foot{color:#374151;font-size:10px;font-weight:600}.words .label{color:#111827;font-weight:700;font-size:10.5px}.words-text{margin-top:4px;font-weight:700;font-size:12px;line-height:1.35;color:#111827}
</style>
</head>
<body>
<div class="sheet">
<div class="accent"></div>
<div class="header">
  <div>
    <div class="title">${orgName}</div>
    ${orgAddress ? `<div class="sub">${orgAddress}</div>` : ''}
    <div class="sub">फोन नं.: ${orgPhone}</div>
  </div>
  <div>
    <div class="gold">${escapeHtml(t.estimatedBill)}</div>
    <div class="sub" style="text-align:right">${escapeHtml(t.invoiceSubtitle)}</div>
  </div>
</div>
<div class="meta">
  <div class="left">
    <div class="label">${escapeHtml(t.billRecipient)}</div>
    <div class="value">${customerName}</div>
    ${customerPhone}
  </div>
  <div class="right">
    <div class="row"><span class="label">${escapeHtml(t.invoiceNo)}</span><span>${toNepaliDigits(normalizedBill.estimateNo)}</span></div>
    <div class="row"><span class="label">${escapeHtml(t.date)}</span><span>${toNepaliDigits(formatDateByLanguage(normalizedBill.date, 'ne'))}</span></div>
    <div class="row status-row"><span class="label">${escapeHtml(t.paymentStatus)}</span><span class="status-badge ${paymentStatusClass}">${escapeHtml(paymentStatus)}</span></div>
  </div>
</div>
<table>
  <thead>
    <tr>
      <th class="center" style="width:44px">क्र.सं.</th>
      <th class="item-name">${escapeHtml(t.itemName)}</th>
      <th class="right" style="width:76px">${escapeHtml(t.quantity)}</th>
      <th class="center" style="width:58px">${escapeHtml(t.unit)}</th>
      <th class="right" style="width:116px">${escapeHtml(t.pricePerUnit)}</th>
      <th class="right" style="width:116px">${escapeHtml(t.amount)}</th>
    </tr>
  </thead>
  <tbody>${rowsHtml}</tbody>
</table>
<div class="end-marker">-- अन्त --</div>
<div class="summary">
  <div class="words">
    <div class="label">शब्दमा रकम</div>
    <div class="words-text">${escapeHtml(words)}</div>
    <div class="sign">
      <div class="sign-box">
        <div class="sign-label">${escapeHtml(t.signature)}</div>
        <div class="sign-line"></div>
        <div class="sign-sub">${escapeHtml(t.authorizedSignatory)}</div>
      </div>
    </div>
  </div>
  <div class="totals">
    <div class="totrow"><span>${escapeHtml(t.subTotal)}</span><span>रु ${toNepaliDigits((Number(normalizedBill.subTotal) || 0).toFixed(2))}</span></div>
    <div class="totrow"><span>${escapeHtml(t.discount)}</span><span>${discountDisplay}</span></div>
    <div class="totrow total"><span>${escapeHtml(t.grandTotal)}</span><span>रु ${toNepaliDigits((Number(normalizedBill.total) || 0).toFixed(2))}</span></div>
    <div class="totrow recv"><span>${escapeHtml(t.received)}</span><span>रु ${toNepaliDigits((Number(normalizedBill.received) || 0).toFixed(2))}</span></div>
    <div class="totrow ${balanceRowClass}"><span>${escapeHtml(t.balanceDue)}</span><span>रु ${toNepaliDigits(balance.toFixed(2))}</span></div>
  </div>
</div>
<div class="foot">
  <span class="foot-left">${escapeHtml(t.thankYou)}</span>
  <span class="foot-right">${escapeHtml(rightFooterNote)}</span>
</div>
</div>
</body>
</html>`;
};

const createNepaliPdfDocViaCanvas = async (billData, profile = {}) => {
  const t = getText('ne');
  const normalizedBill = normalizeBillData(billData, t);
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-1;';
  container.innerHTML = createNepaliHtmlTemplate(normalizedBill, profile, t);
  document.body.appendChild(container);

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => setTimeout(resolve, 180));

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const imgData = canvas.toDataURL('image/png');
    const pageW = 210;
    const pageH = (canvas.height * pageW) / canvas.width;

    doc.addImage(imgData, 'PNG', 0, 0, pageW, pageH);
    return doc;
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
};

const createBillPdfDoc = async (billData, profile = {}, settings = {}) => {
  const language = resolveLanguage(settings);
  const t = getText(language);
  const isEnglish = language === 'en';

  if (language === 'ne') {
    return createNepaliPdfDocViaCanvas(billData, profile, settings);
  }

  const doc = new jsPDF("p", "pt", "a4");

  let pdfFontFamily = 'helvetica';
  if (language === 'ne') {
    const loaded = await ensureNepaliFont(doc);
    if (loaded) {
    pdfFontFamily = 'NotoSansDevanagari';
    doc.setFont('NotoSansDevanagari', 'normal');
    }
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const normalizedBill = normalizeBillData(billData, t);

  const customerName = normalizedBill.customerName;
  const customerPhone = normalizedBill.customerPhone;
  const estimateNo = normalizedBill.estimateNo;
  const billDate = formatDateByLanguage(normalizedBill.date, language);
  const subTotal = normalizedBill.subTotal;
  const discount = normalizedBill.discount;
  const total = normalizedBill.total;
  const received = normalizedBill.received;
  const balance = normalizedBill.balance;

  // const paymentStatus = balance <= 0
    // ? t.paid
    // : received > 0
    //   ? t.partiallyPaid
    //   : t.unpaid;

  const statusBadgeText = balance <= 0
    ? (language === 'ne' ? 'भुक्तानी भयो' : 'PAID')
    : received > 0
      ? (language === 'ne' ? 'आंशिक' : 'PARTIAL')
      : (language === 'ne' ? 'बाँकी' : 'UNPAID');

  const amountInWordsLabel = language === 'ne' ? 'शब्दमा रकम' : 'AMOUNT IN WORDS';
  const grandTotalLabel = t.grandTotal || t.total;

  const organizationLines = formatOrganizationLines(profile.organizationName || profile.businessName || t.fallbackCompany);
  const organizationAddress = String(profile.address || '').trim();
  const organizationPhone = profile.mobileNo ? `${t.phoneLabel}: ${profile.mobileNo}` : "";

  const marginX = 20;
  const contentWidth = pageWidth - (marginX * 2);

  const colors = {
    headerNavy: [22, 24, 52],
    navy: [22, 24, 52],
    gold: [244, 204, 82],
    border: [218, 223, 229],
    lightGray: [246, 247, 249],
    altGray: [250, 251, 253],
    muted: [119, 126, 138],
    label: [119, 126, 138],
    text: [33, 39, 49],
    danger: [196, 55, 43],
    successBg: [232, 244, 235],
    greenBg: [232, 244, 235],
    successText: [53, 128, 79],
    warningBg: [250, 236, 189],
    dueBg: [251, 232, 232],
    pinkBg: [251, 232, 232],
    pinkText: [184, 49, 49]
  };

  const topAccentY = 16;
  doc.setFillColor(195, 57, 43);
  doc.rect(marginX, topAccentY, contentWidth, 6, 'F');

  // 1) Dark header band
  const headerY = topAccentY + 6;
  const headerH = 96;
  doc.setFillColor(...colors.headerNavy);
  doc.rect(marginX, headerY, contentWidth, headerH, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(23);
  drawPdfText(doc, language, organizationLines[0], marginX + 18, headerY + 31, undefined, 'bold');
  if (organizationLines[1]) {
    doc.setFontSize(23);
    drawPdfText(doc, language, organizationLines[1], marginX + 18, headerY + 58, undefined, 'bold');
  }

  if (organizationAddress) {
    doc.setFontSize(11);
    doc.setTextColor(193, 200, 215);
    drawPdfText(doc, language, organizationAddress, marginX + 18, headerY + 74);
  }

  if (organizationPhone) {
    doc.setFontSize(10);
    doc.setTextColor(193, 200, 215);
    drawPdfText(doc, language, organizationPhone, marginX + 18, headerY + 88);
  }

  doc.setTextColor(...colors.gold);
  doc.setFontSize(24);
  drawPdfText(doc, language, t.estimatedBill, marginX + contentWidth - 16, headerY + 34, { align: 'right' }, 'bold');
  doc.setTextColor(201, 207, 221);
  doc.setFontSize(11.5);
  drawPdfText(doc, language, t.invoiceSubtitle, marginX + contentWidth - 16, headerY + 54, { align: 'right' });

  // 2) Two-column meta row
  const metaY = headerY + headerH;
  const metaH = 92;
  const leftMetaW = contentWidth * (isEnglish ? 0.66 : 0.7);
  const rightMetaW = contentWidth - leftMetaW;
  const rightMetaX = marginX + leftMetaW;

  doc.setDrawColor(...colors.border);
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, metaY, leftMetaW, metaH, 'FD');
  doc.setFillColor(...colors.lightGray);
  doc.rect(rightMetaX, metaY, rightMetaW, metaH, 'FD');

  doc.setFontSize(11);
  doc.setTextColor(...colors.muted);
  drawPdfText(doc, language, t.billRecipient, marginX + 14, metaY + 22);
  doc.setFontSize(13.5);
  doc.setTextColor(...colors.text);
  drawPdfText(doc, language, customerName, marginX + 14, metaY + 46, undefined, 'bold');
  if (customerPhone) {
    doc.setFontSize(10.5);
    doc.setTextColor(...colors.muted);
    drawPdfText(doc, language, `${t.phoneLabel}: ${customerPhone}`, marginX + 14, metaY + 67);
  }

  doc.setFontSize(isEnglish ? 10.5 : 11);
  doc.setTextColor(...colors.muted);
  drawPdfText(doc, language, t.invoiceNo, rightMetaX + 12, metaY + 24);
  drawPdfText(doc, language, t.date, rightMetaX + 12, metaY + 48);
  drawPdfText(doc, language, t.paymentStatus, rightMetaX + 12, metaY + 72);

  doc.setFontSize(12.5);
  doc.setTextColor(...colors.text);
  drawPdfText(doc, language, String(estimateNo), rightMetaX + rightMetaW - 12, metaY + 24, { align: 'right' }, 'bold');
  drawPdfText(doc, language, billDate, rightMetaX + rightMetaW - 12, metaY + 48, { align: 'right' }, 'bold');

  const badgeText = statusBadgeText;
  const badgeW = isEnglish ? 66 : 48;
  const badgeH = 18;
  const badgeX = rightMetaX + rightMetaW - badgeW - 12;
  const badgeY = metaY + 62;
  doc.setFillColor(...colors.warningBg);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4, 4, 'F');
  doc.setFontSize(10.5);
  doc.setTextColor(121, 96, 25);
  drawPdfText(doc, language, badgeText, badgeX + badgeW / 2, badgeY + 12.5, { align: 'center' }, 'bold');

  // Items table
  const tableData = (normalizedBill.items || []).map((item, idx) => {
    const qty = toFiniteNumber(item?.qty, 0);
    const amount = toFiniteNumber(item?.amount, 0);
    const adjustedPricePerUnit = qty > 0 ? (amount / qty) : toFiniteNumber(item?.price, 0);
    return [
      (idx + 1).toString(),
      item?.productName || '-',
      qty.toString(),
      item?.unit || '-',
      formatCurrency(adjustedPricePerUnit, language),
      formatCurrency(amount, language)
    ];
  });

  if (tableData.length === 0) {
    tableData.push(['1', '-', '0', '-', formatCurrency(0, language), formatCurrency(0, language)]);
  }

  const serialHeader = language === 'ne' ? 'क्रम' : '#';

  autoTable(doc, {
    head: [[serialHeader, t.itemName, t.quantity, t.unit, t.pricePerUnit, t.amount]],
    body: tableData,
    startY: metaY + metaH,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    styles: {
      font: pdfFontFamily,
      fontSize: 10,
      cellPadding: { top: 8, right: 10, bottom: 8, left: 10 },
      textColor: colors.text,
      lineColor: colors.border,
      lineWidth: 0.5,
      overflow: isEnglish ? 'ellipsize' : 'linebreak'
    },
    headStyles: {
      font: pdfFontFamily,
      fillColor: colors.navy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      font: pdfFontFamily,
      fillColor: [255, 255, 255]
    },
    alternateRowStyles: {
      fillColor: colors.altGray
    },
    didParseCell: (data) => {
      if (language !== 'ne') {
        data.cell.styles.font = pdfFontFamily;
        return;
      }

      const cellText = Array.isArray(data.cell.text)
        ? data.cell.text.join(' ')
        : String(data.cell.raw ?? data.cell.text ?? '');
      const hasDevanagari = /[\u0900-\u097F]/.test(cellText);
      data.cell.styles.font = nepaliFontReady && hasDevanagari ? 'NotoSansDevanagari' : 'helvetica';
      data.cell.styles.fontStyle = 'normal';
    },
    columnStyles: isEnglish
      ? {
          // Total width = 555pt (fills printable content width)
          0: { cellWidth: 38, halign: 'center' },
          1: { cellWidth: 218, halign: 'left' },
          2: { cellWidth: 78, halign: 'center' },
          3: { cellWidth: 58, halign: 'center' },
          4: { cellWidth: 81, halign: 'right' },
          5: { cellWidth: 82, halign: 'right' }
        }
      : {
          0: { cellWidth: 42, halign: 'center' },
          1: { cellWidth: 202, halign: 'left' },
          2: { cellWidth: 60, halign: 'center' },
          3: { cellWidth: 55, halign: 'center' },
          4: { cellWidth: 92, halign: 'right' },
          5: { cellWidth: 92, halign: 'right' }
        }
  });

  const words = `${numberToWordsIndian(Math.round(total), language)} ${t.only}`;
  const footerSectionHeight = 226;
  let y = doc.lastAutoTable.finalY + 10;

  if (y + footerSectionHeight > pageHeight - 30) {
    doc.addPage();
    y = 24;
  }

  // 4) Bottom two-column section
  const leftPanelW = contentWidth * (isEnglish ? 0.6 : 0.67);
  const rightPanelW = contentWidth - leftPanelW;
  const rightX = marginX + leftPanelW;
  const bottomH = 176;

  doc.setFillColor(...colors.lightGray);
  doc.setDrawColor(...colors.border);
  doc.rect(marginX, y, leftPanelW, bottomH, 'FD');

  doc.setFontSize(11);
  doc.setTextColor(...colors.label);
  drawPdfText(doc, language, amountInWordsLabel, marginX + 16, y + 24);
  doc.setFontSize(13);
  doc.setTextColor(...colors.text);
  drawPdfText(doc, language, words, marginX + 16, y + 48, { maxWidth: leftPanelW - 28, align: 'left' }, 'italic');

  doc.setFontSize(12);
  doc.setTextColor(...colors.muted);
  drawPdfText(doc, language, `${t.total}: ${formatCurrency(total, language)}`, marginX + 16, y + 92, undefined, 'bold');

  doc.setFontSize(11);
  doc.setTextColor(...colors.label);
  drawPdfText(doc, language, t.signature, marginX + 16, y + 128, undefined, 'bold');
  doc.setDrawColor(168, 173, 182);
  doc.line(marginX + 16, y + 156, marginX + 170, y + 156);
  drawPdfText(doc, language, t.authorizedSignatory, marginX + 18, y + 172);

  doc.setFillColor(255, 255, 255);
  doc.rect(rightX, y, rightPanelW, bottomH, 'FD');
  doc.setDrawColor(...colors.border);
  doc.line(rightX, y + 34, rightX + rightPanelW, y + 34);
  doc.line(rightX, y + 68, rightX + rightPanelW, y + 68);
  doc.line(rightX, y + 102, rightX + rightPanelW, y + 102);
  doc.line(rightX, y + 136, rightX + rightPanelW, y + 136);

  doc.setFontSize(12);
  doc.setTextColor(...colors.muted);
  drawPdfText(doc, language, t.subTotal, rightX + 12, y + 22);
  drawPdfText(doc, language, t.discount, rightX + 12, y + 56);

  doc.setFontSize(13);
  doc.setTextColor(...colors.text);
  drawPdfText(doc, language, formatCurrency(subTotal, language), rightX + rightPanelW - 12, y + 22, { align: 'right' }, 'bold');
  doc.setTextColor(...colors.danger);
  const discountValue = discount > 0 ? `- ${formatCurrency(discount, language)}` : formatCurrency(discount, language);
  drawPdfText(doc, language, discountValue, rightX + rightPanelW - 12, y + 56, { align: 'right' }, 'bold');

  doc.setFillColor(195, 57, 43);
  doc.rect(rightX, y + 68, rightPanelW, 34, 'F');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  drawPdfText(doc, language, grandTotalLabel, rightX + 12, y + 90, undefined, 'bold');
  drawPdfText(doc, language, formatCurrency(total, language), rightX + rightPanelW - 12, y + 90, { align: 'right' }, 'bold');

  doc.setFillColor(...colors.greenBg);
  doc.rect(rightX, y + 102, rightPanelW, 34, 'F');
  doc.setTextColor(...colors.successText);
  drawPdfText(doc, language, t.received, rightX + 12, y + 124);
  drawPdfText(doc, language, formatCurrency(received, language), rightX + rightPanelW - 12, y + 124, { align: 'right' }, 'bold');

  doc.setFillColor(...colors.pinkBg);
  doc.rect(rightX, y + 136, rightPanelW, 34, 'F');
  doc.setTextColor(...colors.pinkText);
  doc.setFontSize(isEnglish ? 13 : 15);
  drawPdfText(doc, language, t.balanceDue, rightX + 12, y + 158, undefined, 'bold');
  doc.setFontSize(isEnglish ? 13 : 16);
  drawPdfText(doc, language, formatCurrency(balance, language), rightX + rightPanelW - 12, y + 158, { align: 'right' }, 'bold');

  // 5) Footer strip
  const footerY = y + bottomH + 10;
  doc.setFillColor(...colors.lightGray);
  doc.setDrawColor(...colors.border);
  doc.rect(marginX, footerY, contentWidth, 28, 'FD');
  doc.setFontSize(10.5);
  doc.setTextColor(150, 154, 162);
  drawPdfText(doc, language, t.thankYou, marginX + 16, footerY + 19);
  drawPdfText(doc, language, t.computerGenerated, marginX + contentWidth - 16, footerY + 19, { align: 'right', maxWidth: 170 });

  return doc;
};

export const getBillPdfFilename = (billData) => {
  const estimateNo = pickFirstText(billData?.estimateNo, billData?.invoiceNo, billData?.billNo, 'Bill');
  const customerName = pickFirstText(
    billData?.customer?.name,
    billData?.customerName,
    billData?.customer?.phone,
    TRANSLATIONS.en.fallbackBill
  );
  return `${estimateNo} - ${customerName}.pdf`;
};

export const generateBillPdfBlob = async (billData, profile = {}, settings = {}) => {
  const doc = await createBillPdfDoc(billData, profile, settings);
  return doc.output('blob');
};

export const generateBillPDF = async (billData, profile = {}, settings = {}) => {
  const doc = await createBillPdfDoc(billData, profile, settings);
  const filename = getBillPdfFilename(billData);
  doc.save(filename);
};
