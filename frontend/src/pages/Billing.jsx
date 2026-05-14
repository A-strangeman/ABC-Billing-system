import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { API } from '../utils/api';
import { generateBillPDF, generateBillPdfBlob, getBillPdfFilename } from '../utils/generatePdf';
import { useAuth } from '../contexts/AuthContext';
import TopbarControls from '../components/TopbarControls';
import PageSEO from '../components/PageSEO';
import './Billing.css';

const normalizeProductKey = (value) => String(value || '').trim().toLowerCase();
const MIN_BILL_DOWNLOAD_INDICATOR_MS = 700;

const toPriceOrNull = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const buildPriceMap = (catalog, priceType) => {
  const map = new Map();
  const categories = catalog?.categories || [];
  const materials = catalog?.materials || [];
  const sizes = catalog?.sizes || [];
  const fittings = catalog?.fittings || [];

  for (const material of materials) {
    const categoryName = categories.find((category) => category._id === material.categoryId)?.name || '';
    const materialName = material?.name || '';
    const sizesForMaterial = sizes.filter((size) => size.materialId === material._id);
    const fittingsForMaterial = fittings.filter((fitting) => fitting.materialId === material._id);

    if (sizesForMaterial.length > 0 && fittingsForMaterial.length > 0) {
      for (const size of sizesForMaterial) {
        const sizeValue = size?.value || size?.size || '';
        for (const fitting of fittingsForMaterial) {
          const fittingName = fitting?.name || '';
          const key = normalizeProductKey(`${materialName} ${sizeValue} ${fittingName}`);
          if (!key) continue;
          const priceValue = priceType === 'buying'
            ? toPriceOrNull(size?.buyingPrice, fitting?.buyingPrice, material?.buyingPrice)
            : toPriceOrNull(size?.sellingPrice, fitting?.sellingPrice, material?.sellingPrice);
          if (priceValue !== null) map.set(key, priceValue);

          // Backward-compatible alias for older bills that may include category in product name.
          const categoryAliasKey = normalizeProductKey(`${categoryName} ${materialName} ${sizeValue} ${fittingName}`);
          if (priceValue !== null && categoryAliasKey) map.set(categoryAliasKey, priceValue);
        }
      }
      continue;
    }

    if (sizesForMaterial.length > 0) {
      for (const size of sizesForMaterial) {
        const sizeValue = size?.value || size?.size || '';
        const key = normalizeProductKey(`${categoryName} ${materialName} ${sizeValue}`);
        if (!key) continue;
        const priceValue = priceType === 'buying'
          ? toPriceOrNull(size?.buyingPrice, material?.buyingPrice)
          : toPriceOrNull(size?.sellingPrice, material?.sellingPrice);
        if (priceValue !== null) map.set(key, priceValue);

        const legacyKey = normalizeProductKey(`${materialName} ${sizeValue}`);
        if (priceValue !== null && legacyKey) map.set(legacyKey, priceValue);
      }
      continue;
    }

    if (fittingsForMaterial.length > 0) {
      for (const fitting of fittingsForMaterial) {
        const fittingName = fitting?.name || '';
        const key = normalizeProductKey(`${categoryName} ${materialName} ${fittingName}`);
        if (!key) continue;
        const priceValue = priceType === 'buying'
          ? toPriceOrNull(fitting?.buyingPrice, material?.buyingPrice)
          : toPriceOrNull(fitting?.sellingPrice, material?.sellingPrice);
        if (priceValue !== null) map.set(key, priceValue);

        const legacyKey = normalizeProductKey(`${materialName} ${fittingName}`);
        if (priceValue !== null && legacyKey) map.set(legacyKey, priceValue);
      }
      continue;
    }

    const materialKey = normalizeProductKey(`${categoryName} ${materialName}`);
    const materialPrice = priceType === 'buying'
      ? toPriceOrNull(material?.buyingPrice)
      : toPriceOrNull(material?.sellingPrice);
    if (materialKey && materialPrice !== null) {
      map.set(materialKey, materialPrice);
    }

    const legacyMaterialKey = normalizeProductKey(materialName);
    if (legacyMaterialKey && materialPrice !== null) {
      map.set(legacyMaterialKey, materialPrice);
    }
  }

  return map;
};

function MissingPriceModal({ open, items, onConfirm, onCancel }) {
  if (!open) return null;
  const previewNames = items.slice(0, 3).map((item) => item.productName).join(', ');
  const extraCount = items.length - 3;
  const itemListText = extraCount > 0
    ? `${previewNames} +${extraCount} more`
    : previewNames;
  return (
    <div className="billing-modal-overlay">
      <div className="billing-modal">
        <div className="billing-modal-title">Missing Prices Warning</div>
        <div className="billing-modal-body">
          <div>Some items do not have a price entered:</div>
          <div className="billing-modal-items">{itemListText}</div>
          <div className="billing-modal-desc mt-2">Do you want to download the bill anyway?</div>
        </div>
        <div className="billing-modal-actions mt-4 flex gap-3 justify-end">
          <button className="billing-btn billing-btn-ghost px-4 py-2 rounded font-bold" onClick={onCancel}>Cancel</button>
          <button className="billing-btn billing-btn-primary px-4 py-2 rounded font-bold" onClick={onConfirm}>Download Anyway</button>
        </div>
      </div>
    </div>
  );
}

function Billing() {
  const navigate = useNavigate();
  const location = useLocation();
  const { billId, draftId } = location.state || {};
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState({
    estimateNo: '',
    date: new Date().toISOString().split('T')[0],
    customer: { name: '', phone: '' },
    items: [{ id: Date.now(), productName: '', qty: 1, unit: 'Pcs', price: 0, amount: 0 }],
    subTotal: 0,
    discountPercent: 0,
    discountRs: 0,
    total: 0,
    received: 0,
    balance: 0,
    amountWords: 'Zero Rupees only'
  });

  const [catalog, setCatalog] = useState({ categories: [], materials: [], sizes: [], fittings: [] });
  const [activeRow, setActiveRow] = useState(0);
  const [selections, setSelections] = useState({ categoryId: '', materialId: '', sizeId: '', fittingId: '' });
  const [, setPriceHistory] = useState([]); // priceHistory read value unused
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [isBillDownloading, setIsBillDownloading] = useState(false);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  const [pdfLanguage, setPdfLanguage] = useState(() => {
    const saved = localStorage.getItem('abc.pdfLanguage');
    return saved === 'ne' ? 'ne' : 'en';
  });
  const [activeDraftId, setActiveDraftId] = useState(draftId || '');
  const [toast, setToast] = useState({ show: false, message: '', tone: 'info' });
  const [showMissingPriceModal, setShowMissingPriceModal] = useState(false);
  const [pendingDownload, setPendingDownload] = useState(false);
  const toastTimerRef = useRef(null);
  const downloadSuccessTimerRef = useRef(null);
  const warnedBelowCostKeysRef = useRef(new Set());
  const tableScrollRef = useRef(null);
  const sidebarScrollRef = useRef(null);
  const productInputRefs = useRef({});

  const buyingPriceMap = useMemo(() => buildPriceMap(catalog, 'buying'), [catalog]);
  const sellingPriceMap = useMemo(() => buildPriceMap(catalog, 'selling'), [catalog]);

  const categoryById = useMemo(
    () => new Map((catalog.categories || []).map((c) => [c._id, c])),
    [catalog.categories]
  );
  const materialById = useMemo(
    () => new Map((catalog.materials || []).map((m) => [m._id, m])),
    [catalog.materials]
  );
  const sizeById = useMemo(
    () => new Map((catalog.sizes || []).map((s) => [s._id, s])),
    [catalog.sizes]
  );
  const fittingById = useMemo(
    () => new Map((catalog.fittings || []).map((f) => [f._id, f])),
    [catalog.fittings]
  );

  const materialsByCategory = useMemo(() => {
    const map = new Map();
    for (const material of catalog.materials || []) {
      const key = material.categoryId;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(material);
    }
    return map;
  }, [catalog.materials]);

  const sizesByMaterial = useMemo(() => {
    const map = new Map();
    for (const size of catalog.sizes || []) {
      const key = size.materialId;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(size);
    }
    return map;
  }, [catalog.sizes]);

  const fittingsByMaterial = useMemo(() => {
    const map = new Map();
    for (const fitting of catalog.fittings || []) {
      const key = fitting.materialId;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(fitting);
    }
    return map;
  }, [catalog.fittings]);

  const belowCostItems = useMemo(() => {
    return (bill.items || [])
      .map((item, index) => {
        const key = normalizeProductKey(item?.productName);
        if (!key || !buyingPriceMap.has(key)) return null;

        const buyingPrice = buyingPriceMap.get(key);
        const sellingPrice = Number(item?.price);
        if (!Number.isFinite(sellingPrice)) return null;
        if (sellingPrice <= 0) return null;
        if (sellingPrice >= buyingPrice) return null;

        return {
          index,
          productName: item?.productName || `Item ${index + 1}`,
          sellingPrice,
          buyingPrice
        };
      })
      .filter(Boolean);
  }, [bill.items, buyingPriceMap]);

  const missingPriceItems = useMemo(() => {
    return (bill.items || [])
      .filter((item) => {
        const hasName = Boolean(String(item?.productName || '').trim());
        const price = Number(item?.price);
        return hasName && (!Number.isFinite(price) || price <= 0);
      })
      .map((item, index) => ({
        index,
        productName: String(item?.productName || '').trim() || `Item ${index + 1}`,
      }));
  }, [bill.items]);

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billId, draftId]); // loadInitialData not in deps to avoid infinite loop

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      if (downloadSuccessTimerRef.current) {
        clearTimeout(downloadSuccessTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!belowCostItems.length) {
      warnedBelowCostKeysRef.current.clear();
      return;
    }

    for (const item of belowCostItems) {
      const warningKey = `${normalizeProductKey(item.productName)}|${item.sellingPrice}`;
      if (warnedBelowCostKeysRef.current.has(warningKey)) continue;

      warnedBelowCostKeysRef.current.add(warningKey);
      showToast(
        `Alert: ${item.productName} is below buying price (SP ${item.sellingPrice.toFixed(2)} < BP ${item.buyingPrice.toFixed(2)}).`,
        'warning'
      );
      break;
    }
  }, [belowCostItems]);

  const showToast = (message, tone = 'info') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ show: true, message, tone });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
      toastTimerRef.current = null;
    }, 2600);
  };

  const scrollSidebarToBottom = (behavior = 'smooth') => {
    requestAnimationFrame(() => {
      const sidebar = sidebarScrollRef.current;
      if (!sidebar) return;
      sidebar.scrollTo({ top: sidebar.scrollHeight, behavior });
    });
  };

  const runWithBillDownloadIndicator = async (operation) => {
    if (isBillDownloading) return false;

    const startedAt = Date.now();
    let completed = false;
    setIsBillDownloading(true);
    setShowDownloadSuccess(false);

    try {
      await operation();
      completed = true;
      return true;
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_BILL_DOWNLOAD_INDICATOR_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_BILL_DOWNLOAD_INDICATOR_MS - elapsed));
      }
      setIsBillDownloading(false);

      if (completed) {
        setShowDownloadSuccess(true);
        if (downloadSuccessTimerRef.current) {
          clearTimeout(downloadSuccessTimerRef.current);
        }
        downloadSuccessTimerRef.current = setTimeout(() => {
          setShowDownloadSuccess(false);
          downloadSuccessTimerRef.current = null;
        }, 520);
      }
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [invoiceRes, catalogRes] = await Promise.all([
        API.getNextInvoiceNo(),
        API.getCatalog()
      ]);
      const invData = await invoiceRes.json();
      const catData = await catalogRes.json();
      setCatalog(catData);
      if (billId) {
        const bRes = await API.getBill(billId);
        const bData = await bRes.json();
        setBill({
          ...bData,
          items: (bData.items || []).map((it) => ({ ...it, id: Date.now() + Math.random() })),
          discountRs: bData.discount || 0
        });
      } else if (draftId) {
        const dRes = await API.getDraft(draftId);
        const dData = await dRes.json();
        if (dRes.ok) {
          setActiveDraftId(dData._id || draftId);
          setBill({
            ...dData,
            items: (dData.items || []).map((it) => ({ ...it, id: Date.now() + Math.random() })),
            discountRs: dData.discount || 0
          });
        } else {
          showToast(dData.error || dData.message || 'Draft not found.', 'error');
          setBill(prev => ({ ...prev, estimateNo: invData.nextInvoiceNo }));
        }
      } else {
        setActiveDraftId('');
        setBill(prev => ({ ...prev, estimateNo: invData.nextInvoiceNo }));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...bill.items];
    if (field === 'qty') {
      newItems[index][field] = Math.max(0, Number(value) || 0);
    } else {
      newItems[index][field] = value;
    }
    if (field === 'productName' && typeof value === 'string') {
        const plyPattern = /\((\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\)\s*(\d+)/;
        const match = value.match(plyPattern);
        if (match) {
            newItems[index].qty = (parseFloat(match[1]) || 0) * (parseFloat(match[2]) || 0) * (parseInt(match[3]) || 0);
            newItems[index].unit = "Sq-Ft";
        }
    }
    if (field === 'qty' || field === 'price' || field === 'productName') {
      newItems[index].amount = (newItems[index].qty || 0) * (newItems[index].price || 0);
    }
    calculateTotals(newItems, bill.discountPercent, bill.discountRs, bill.received);
  };

  const calculateTotals = (items, dPercent, dRs, received) => {
    const subTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const discountFromPercent = subTotal * (dPercent / 100);
    const discount = dRs > 0 ? dRs : discountFromPercent;
    const total = subTotal - discount;
    const balance = total - received;

    setBill(prev => ({
      ...prev,
      items,
      subTotal,
      discountPercent: dPercent,
      discountRs: Number(discount.toFixed(2)),
      total,
      received,
      balance,
      amountWords: `Rupees ${Math.round(total).toLocaleString('en-IN')} only`
    }));
  };

  const focusProductInput = (rowIndex) => {
    requestAnimationFrame(() => {
      const input = productInputRefs.current[rowIndex];
      if (!input) return;
      input.focus();
      const textLength = input.value?.length || 0;
      input.setSelectionRange(textLength, textLength);
    });
  };

  const addRow = ({ focusNewRow = false } = {}) => {
    const nextRowIndex = bill.items.length;
    setBill((prev) => ({
      ...prev,
      items: [...prev.items, { id: Date.now(), productName: '', qty: 1, unit: 'Pcs', price: 0, amount: 0 }]
    }));
    setActiveRow(nextRowIndex);

    requestAnimationFrame(() => {
      if (!tableScrollRef.current) return;
      tableScrollRef.current.scrollTop = tableScrollRef.current.scrollHeight;
    });

    scrollSidebarToBottom('auto');

    if (focusNewRow) {
      focusProductInput(nextRowIndex);
    }
  };

  const handleProductNameEnter = (event, rowIndex) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    const isLastRow = rowIndex === bill.items.length - 1;
    if (isLastRow) {
      addRow({ focusNewRow: true });
      return;
    }

    const nextIndex = rowIndex + 1;
    setActiveRow(nextIndex);
    focusProductInput(nextIndex);
  };

  const deleteRow = (index) => {
    if (bill.items.length === 1) return;
    const newItems = bill.items.filter((_, i) => i !== index);
    calculateTotals(newItems, bill.discountPercent, bill.discountRs, bill.received);
    if (activeRow >= newItems.length) setActiveRow(newItems.length - 1);
  };

  const applyPercentToAll = () => {
    const p = prompt("Enter percentage markup/discount (+10, -5, etc):");
    if (p === null) return;
    const val = parseFloat(p);
    const newItems = bill.items.map(it => {
        if (it.price > 0) {
            const newPrice = it.price + (it.price * (val/100));
            return { ...it, price: parseFloat(newPrice.toFixed(2)), amount: it.qty * newPrice };
        }
        return it;
    });
    calculateTotals(newItems, bill.discountPercent, bill.discountRs, bill.received);
  };

  const handleFetchSellingPrices = () => {
    let updatedCount = 0;
    let matchedCount = 0;

    const newItems = bill.items.map((item) => {
      const key = normalizeProductKey(item?.productName);
      if (!key || !sellingPriceMap.has(key)) {
        return item;
      }

      const sp = sellingPriceMap.get(key);
      matchedCount += 1;

      if (!Number.isFinite(sp)) {
        return item;
      }

      if (Number(item.price) === sp) {
        return item;
      }

      updatedCount += 1;
      return {
        ...item,
        price: sp,
        amount: (item.qty || 0) * sp
      };
    });

    if (matchedCount === 0) {
      showToast('No matching Price List SP found for current item names.', 'warning');
      return;
    }

    calculateTotals(newItems, bill.discountPercent, bill.discountRs, bill.received);

    if (updatedCount === 0) {
      showToast('All matched items already have Price List SP.', 'info');
      return;
    }

    showToast(`Fetched Price List SP for ${updatedCount} item(s).`, 'success');
  };

  const selectChip = async (type, id, name) => {
    const currentProductName = bill.items?.[activeRow]?.productName || '';
    const rowWasEmpty = !normalizeProductKey(currentProductName);
    const isLastRow = activeRow === bill.items.length - 1;

    const newSels = { ...selections };
    newSels[type] = id;
    if (type === 'categoryId') { newSels.materialId = ''; newSels.sizeId = ''; newSels.fittingId = ''; }
    if (type === 'materialId') { 
        newSels.sizeId = ''; newSels.fittingId = '';
        try {
          const res = await API.getPriceHistory(name);
          const history = await res.json();
          setPriceHistory(history);
        } catch {
          // price history unavailable, non-critical
        }
    }
    setSelections(newSels);

    if (type === 'categoryId' || type === 'materialId' || type === 'sizeId') {
      scrollSidebarToBottom();
    }

    const selectedMaterialId = type === 'materialId' ? id : newSels.materialId;
    const selectedSizeId = type === 'sizeId' ? id : newSels.sizeId;
    const selectedFittingId = type === 'fittingId' ? id : newSels.fittingId;

    const categoryName = categoryById.get(newSels.categoryId)?.name || '';
    const mat = materialById.get(selectedMaterialId)?.name || '';
    const size = sizeById.get(selectedSizeId)?.value || '';
    const fitting = fittingById.get(selectedFittingId)?.name || '';

    const hasSizesForMaterial = (sizesByMaterial.get(newSels.materialId) || []).length > 0;
    const hasFittingsForMaterial = (fittingsByMaterial.get(newSels.materialId) || []).length > 0;

    let fullName = categoryName;
    if (newSels.materialId) {
      if (hasSizesForMaterial && hasFittingsForMaterial) {
        fullName = [mat, size, fitting].filter(Boolean).join(' ');
      } else if (hasSizesForMaterial) {
        fullName = [categoryName, mat, size].filter(Boolean).join(' ');
      } else if (hasFittingsForMaterial) {
        fullName = [categoryName, mat, fitting].filter(Boolean).join(' ');
      } else {
        fullName = [categoryName, mat].filter(Boolean).join(' ');
      }
    }

    const isSelectionComplete =
      !newSels.materialId
        ? false
        : (hasSizesForMaterial && hasFittingsForMaterial)
          ? Boolean(newSels.sizeId && newSels.fittingId)
          : hasSizesForMaterial
            ? Boolean(newSels.sizeId)
            : hasFittingsForMaterial
              ? Boolean(newSels.fittingId)
              : Boolean(newSels.materialId);

    updateItem(activeRow, 'productName', fullName);

    if (isLastRow && rowWasEmpty && fullName && isSelectionComplete) {
      addRow({ focusNewRow: true });
      scrollSidebarToBottom('auto');
    }
  };

  const prepareDataForServer = () => {
      const sanitizedItems = bill.items
        .filter((item) => String(item?.productName || '').trim())
        .map((it) => {
          const { id: _id, ...rest } = it; // _id to avoid unused var warning
          return rest;
        });

      const data = { ...bill };
      data.discount = data.discountRs;
      data.estimateNo = parseInt(data.estimateNo);
      data.items = sanitizedItems;
      return data;
  };

  const handleFinalize = async () => {
    if (isBillDownloading) return;

    if (!bill.customer.name) {
      showToast('Please enter customer name before finalizing.', 'warning');
      return;
    }

    if (belowCostItems.length > 0) {
      showToast(`Alert: ${belowCostItems.length} item(s) are below buying price.`, 'warning');
    }

    try {
      const payloadToSave = prepareDataForServer();
      const editId = billId || bill._id;
      const res = editId
        ? await API.updateBill(editId, payloadToSave)
        : await API.saveBill(payloadToSave);
      const payload = await res.json();
      if (res.ok) {
          const sanitizedItems = bill.items.filter((item) => String(item?.productName || '').trim());
          const savedBill = payload?.bill
            ? {
                ...payload.bill,
                discount: payload.bill.discount ?? payload.bill.discountRs ?? bill.discountRs ?? 0
              }
            : {
                ...bill,
                items: sanitizedItems,
                discount: bill.discountRs || 0
              };

          await runWithBillDownloadIndicator(async () => {
            await generateBillPDF(savedBill, {
              organizationName: user?.organizationName,
              mobileNo: user?.mobileNo,
              address: user?.address
            }, {
              language: pdfLanguage
            });
          });
          showToast(editId ? 'Bill updated successfully.' : 'Bill finalized successfully.', 'success');
          navigate('/dashboard');
      } else {
          showToast(payload.error || payload.message || 'Failed to save bill.', 'error');
      }
    } catch {
      showToast('Error saving bill.', 'error');
    }
  };

  const handleDownloadPdf = async () => {
    if (isBillDownloading) return;

    if (missingPriceItems.length > 0 && !pendingDownload) {
      setShowMissingPriceModal(true);
      return;
    }

    try {
      const sanitizedItems = bill.items.filter((item) => String(item?.productName || '').trim());
      const normalizedBill = {
        ...bill,
        items: sanitizedItems,
        customer: {
          ...bill.customer,
          name: bill.customer?.name?.trim() || 'Cash'
        },
        discount: bill.discountRs || 0
      };

      await runWithBillDownloadIndicator(async () => {
        await generateBillPDF(normalizedBill, {
          organizationName: user?.organizationName,
          mobileNo: user?.mobileNo,
          address: user?.address
        }, {
          language: pdfLanguage
        });
      });
    } catch (error) {
      console.error("PDF generation failed:", error);
      showToast(`Failed to generate PDF: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setPendingDownload(false);
    }
  };

  const handleMissingPriceConfirm = () => {
    setShowMissingPriceModal(false);
    setPendingDownload(true);
    setTimeout(() => handleDownloadPdf(), 0);
  };

  const handleMissingPriceCancel = () => {
    setShowMissingPriceModal(false);
    setPendingDownload(false);
    showToast('Download cancelled. Please add prices to all items and try again.', 'warning');
  };

  const handleSaveDraft = async () => {
    try {
      const draftPayload = prepareDataForServer();
      const res = activeDraftId
        ? await API.updateDraft(activeDraftId, draftPayload)
        : await API.saveDraft(draftPayload);
      const payload = await res.json();

      if (!res.ok) {
        showToast(payload.error || payload.message || 'Failed to save draft.', 'error');
        return;
      }

      if (!activeDraftId && payload?.draftId) {
        setActiveDraftId(payload.draftId);
      }
      showToast(activeDraftId ? 'Draft updated successfully.' : 'Draft saved successfully.', 'success');
    } catch {
      showToast('Failed to save draft.', 'error');
    }
  };

  const handleSendWhatsApp = async () => {
    if (sendingWhatsApp || isBillDownloading) return;

    const rawPhone = String(bill.customer?.phone || '').trim();

    let digits = rawPhone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    if (digits.length === 10) {
      digits = `91${digits}`;
    }

    if (rawPhone && digits.length < 10) {
      showToast('Please enter a valid phone number.', 'warning');
      return;
    }

    const businessName = user?.organizationName || 'ABC Company';
    const customerName = bill.customer?.name || 'Customer';
    const invoiceNo = bill.estimateNo || 'N/A';
    const total = Number(bill.total || 0).toFixed(2);
    const paid = Number(bill.received || 0).toFixed(2);
    const balance = Number(bill.balance || 0).toFixed(2);
    const dateText = bill.date || new Date().toISOString().split('T')[0];

    const text = [
      `Hello ${customerName},`,
      '',
      `Your invoice from ${businessName}:`,
      `Invoice No: ${invoiceNo}`,
      `Date: ${dateText}`,
      `Total: Rs ${total}`,
      `Paid: Rs ${paid}`,
      `Balance: Rs ${balance}`,
      '',
      'Thank you for your business.'
    ].join('\n');

    try {
      setSendingWhatsApp(true);

      await runWithBillDownloadIndicator(async () => {
        const preparedBill = {
          ...bill,
          items: bill.items.filter((item) => String(item?.productName || '').trim()),
          discount: bill.discountRs || 0
        };

        const profilePayload = {
          organizationName: user?.organizationName,
          mobileNo: user?.mobileNo,
          address: user?.address
        };

        const pdfBlob = await generateBillPdfBlob(preparedBill, profilePayload, { language: pdfLanguage });

        const file = new File([pdfBlob], getBillPdfFilename(preparedBill), { type: 'application/pdf' });

        // Best case: native file share opens WhatsApp with PDF + text in one flow.
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Invoice ${invoiceNo}`,
            text,
            files: [file]
          });
          showToast('Invoice shared successfully.', 'success');
          return;
        }

        // Fallback: open WhatsApp chat with text and download PDF for quick attach.
        await generateBillPDF(preparedBill, profilePayload, { language: pdfLanguage });
        const fallbackText = `${text}\n\nInvoice PDF downloaded. Please attach and send in WhatsApp.`;

        if (digits) {
          window.open(`https://wa.me/${digits}?text=${encodeURIComponent(fallbackText)}`, '_blank', 'noopener,noreferrer');
        } else {
          window.open(`https://wa.me/?text=${encodeURIComponent(fallbackText)}`, '_blank', 'noopener,noreferrer');
        }
        showToast('WhatsApp opened with invoice message.', 'info');
      });
    } catch (error) {
      console.error('WhatsApp share failed:', error);

      const quickText = encodeURIComponent(text);
      if (digits) {
        window.open(`https://wa.me/${digits}?text=${quickText}`, '_blank', 'noopener,noreferrer');
      } else {
        window.open(`https://wa.me/?text=${quickText}`, '_blank', 'noopener,noreferrer');
      }
      showToast('WhatsApp opened. Please verify and send.', 'warning');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const availableMaterials = useMemo(
    () => materialsByCategory.get(selections.categoryId) || [],
    [materialsByCategory, selections.categoryId]
  );
  const availableSizes = useMemo(
    () => sizesByMaterial.get(selections.materialId) || [],
    [sizesByMaterial, selections.materialId]
  );
  const availableFittings = useMemo(
    () => fittingsByMaterial.get(selections.materialId) || [],
    [fittingsByMaterial, selections.materialId]
  );

  if (loading) return null;

  return (
    <>
      <PageSEO page="billing" />
      <div className="billing-page billing-selection flex flex-col h-screen overflow-hidden font-sans">
      <div className="billing-topbar p-2 px-6 shadow-sm h-[52px] flex items-center justify-between">
        <Link to="/dashboard" className="billing-topbar-title" aria-label="Go to dashboard">
          ABC Company | Estimate Bill
        </Link>
        <TopbarControls
          containerClassName="billing-topbar-actions"
          iconButtonClassName="billing-icon-btn"
          onLogout={handleLogout}
          showLanguageToggle
          language={pdfLanguage}
          onLanguageChange={(nextLanguage) => {
            const safeLanguage = nextLanguage === 'ne' ? 'ne' : 'en';
            setPdfLanguage(safeLanguage);
            localStorage.setItem('abc.pdfLanguage', safeLanguage);
          }}
        />
      </div>

        <div className="flex flex-1 p-3 gap-3 overflow-hidden min-h-0">
          <div className="billing-card flex-[2.5] rounded-md shadow-lg p-5 flex flex-col overflow-hidden min-h-0">
            <h2 className="billing-title text-xl font-bold mb-4">Estimate Details</h2>

           <div className="grid grid-cols-4 gap-4 mb-4">
              <HeaderField label="Estimate No." value={bill.estimateNo} readonly />
              <HeaderField
                label="Date"
                value={bill.date}
                type="date"
                onChange={(value) => setBill(prev => ({ ...prev, date: value }))}
              />
              <HeaderField
                label="Customer Name"
                value={bill.customer.name}
                placeholder="Start typing..."
                onChange={(value) => setBill(prev => ({
                  ...prev,
                  customer: { ...prev.customer, name: value }
                }))}
              />
              <HeaderField
                label="Phone"
                value={bill.customer.phone}
                placeholder="Auto-filled"
                onChange={(value) => setBill(prev => ({
                  ...prev,
                  customer: { ...prev.customer, phone: value }
                }))}
              />
           </div>

            <div ref={tableScrollRef} className="billing-table-wrap rounded shadow-sm mb-3">
              <table className="w-full border-collapse">
                <thead className="billing-table-head">
                    <tr className="text-[11px] font-bold uppercase">
                       <th className="p-2 border border-white/20 w-12 text-center">S.No</th>
                       <th className="p-2 border border-white/20 text-center w-[180px]">Product Name</th>
                       <th className="p-2 border border-white/20 w-[120px] text-center">Quantity</th>
                       <th className="p-2 border border-white/20 w-20 text-center">Unit</th>
                       <th className="p-2 border border-white/20 w-[120px] text-center">Price/Unit (₹)</th>
                       <th className="p-2 border border-white/20 w-32 text-right">Amount (₹)</th>
                       <th className="p-2 border border-white/20 w-12 text-center">Action</th>
                    </tr>
                 </thead>
                 <tbody>
                    {bill.items.map((item, idx) => (
                        <tr key={item.id} className={`h-10 border-b border-gray-100 ${activeRow === idx ? 'billing-row-active' : ''}`} onClick={() => setActiveRow(idx)}>
                          <td className="p-2 text-center text-sm font-bold text-gray-300">{idx + 1}</td>
                          <td className="p-1.5"><input type="text" className="billing-input w-[170px] rounded px-2 py-1 text-xs font-black outline-none uppercase" value={item.productName} ref={(node) => { productInputRefs.current[idx] = node; }} onChange={e => updateItem(idx, 'productName', e.target.value)} onKeyDown={(e) => handleProductNameEnter(e, idx)} /></td>
                          <td className="p-1.5"><input type="number" min="0" className="billing-input w-[110px] rounded px-1 py-1 text-sm text-center font-bold outline-none" value={item.qty} onChange={e => updateItem(idx, 'qty', Math.max(0, parseFloat(e.target.value) || 0))} /></td>
                          <td className="p-1.5"><select className="billing-input billing-select w-full rounded px-1 py-0.5 text-[11px] outline-none" value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}><option>Pcs</option><option>Set</option><option>Mtr</option><option>Kg</option><option>Sq-Ft</option><option>Bundle</option></select></td>
                          <td className="p-1.5"><input type="number" min="0" className="billing-input w-[110px] rounded px-1 py-1 text-sm text-center outline-none font-bold" value={item.price === 0 ? '' : item.price} onChange={e => updateItem(idx, 'price', Math.max(0, parseFloat(e.target.value) || 0))} /></td>
                          <td className="billing-amount p-2 text-right font-black text-sm">{(item.amount || 0).toFixed(2)}</td>
                          <td className="p-2 text-center"><button onClick={(e) => { e.stopPropagation(); deleteRow(idx); }} className="billing-delete-btn w-7 h-7 rounded font-bold text-xs flex items-center justify-center">×</button></td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <button onClick={() => addRow({ focusNewRow: true })} className="billing-btn billing-btn-primary px-4 py-2 rounded font-bold text-xs shadow-sm">+ Add Row</button>
                  <button onClick={handleFetchSellingPrices} className="billing-btn billing-btn-primary px-4 py-2 rounded font-bold text-xs shadow-sm">⟳ Fetch SP (Price List)</button>
                  <button onClick={applyPercentToAll} className="billing-btn billing-btn-primary px-4 py-2 rounded font-bold text-xs shadow-sm">📊 Apply % to All</button>
                  <button onClick={handleSaveDraft} className="billing-btn billing-btn-ghost px-4 py-2 rounded font-bold text-xs shadow-sm">💾 Save Draft</button>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isBillDownloading}
                    className="billing-btn billing-btn-ghost px-4 py-2 rounded font-bold text-xs shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {isBillDownloading ? '⏳ Downloading Bill...' : '⬇️ Download PDF'}
                  </button>
                  <button
                    onClick={handleSendWhatsApp}
                    disabled={sendingWhatsApp || isBillDownloading}
                    className="billing-btn billing-btn-wa px-4 py-2 rounded font-bold text-xs shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {sendingWhatsApp ? '⏳ Sending WhatsApp...' : '💬 Send WhatsApp + PDF'}
                  </button>
                  <button
                    onClick={handleFinalize}
                    disabled={isBillDownloading}
                    className="billing-btn billing-btn-final px-4 py-2 rounded font-bold text-xs shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {isBillDownloading ? '⏳ Downloading Bill...' : '✓ Save & Finalize'}
                  </button>
           </div>

           {belowCostItems.length > 0 && (
             <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
               Alert: {belowCostItems.length} item(s) are being sold below buying price. Please review item prices before finalizing.
             </div>
           )}

           <div className="grid grid-cols-4 gap-4 mb-4">
              <T label="Sub Total (Rs)" value={bill.subTotal} readonly />
              <T label="Discount (%)" value={bill.discountPercent} onChange={v => calculateTotals(bill.items, v, 0, bill.received)} />
              <T label="Discount (Rs)" value={bill.discountRs} onChange={v => calculateTotals(bill.items, 0, v, bill.received)} />
              <T label="Grand Total (Rs)" value={bill.total} readonly accent />
           </div>
           <div className="grid grid-cols-4 gap-4 mb-4">
              <T label="Received (Rs)" value={bill.received} onChange={v => calculateTotals(bill.items, bill.discountPercent, bill.discountRs, v)} />
              <T label="Balance (Rs)" value={bill.balance} readonly highlight />
           </div>

           <div>
              <label className="billing-label billing-label-amount block mb-1">Amount in Words</label>
                <textarea className="billing-input billing-words-input w-full p-2 h-16 rounded" value={bill.amountWords} readOnly />
           </div>
        </div>

            <div ref={sidebarScrollRef} className="billing-sidebar flex-1 rounded-md shadow-lg p-5 flex flex-col h-full overflow-y-auto">
              <div className="billing-sidebar-tip p-3 rounded-md border-l-4 mb-6 leading-relaxed">
               Click a row on the left, then choose Category, Material, and Size to auto-build product names.
            </div>
            <div className="space-y-6">
                <H title="CATEGORY" items={catalog.categories} activeId={selections.categoryId} onSelect={c => selectChip('categoryId', c._id, c.name)} />
              {selections.categoryId && availableMaterials.length > 0 && <H title="MATERIAL" items={availableMaterials} activeId={selections.materialId} onSelect={m => selectChip('materialId', m._id, m.name)} />}
              {selections.materialId && availableSizes.length > 0 && <H title="SIZE" items={availableSizes} activeId={selections.sizeId} onSelect={s => selectChip('sizeId', s._id, s.value || s.size)} display={s => s.value || s.size} />}
              {selections.materialId && availableFittings.length > 0 && <H title="FITTING" items={availableFittings} activeId={selections.fittingId} onSelect={f => selectChip('fittingId', f._id, f.name)} />}
            </div>
        </div>
      </div>

      {toast.show && (
        <div className={`billing-toast billing-toast-${toast.tone}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}

      <MissingPriceModal
        open={showMissingPriceModal}
        items={missingPriceItems}
        onConfirm={handleMissingPriceConfirm}
        onCancel={handleMissingPriceCancel}
      />

      {(isBillDownloading || showDownloadSuccess) && (
        <div className="billing-download-overlay" role="status" aria-live="polite" aria-label="Bill download in progress">
          <div className={`billing-download-indicator ${showDownloadSuccess ? 'is-success' : ''}`}>
            <span className={`billing-download-icon ${showDownloadSuccess ? 'is-success' : ''}`} aria-hidden="true">
              {showDownloadSuccess ? '✓' : <span className="billing-download-spinner" aria-hidden="true" />}
            </span>
            <span>{showDownloadSuccess ? 'Bill downloaded' : 'Downloading bill'}</span>
            {!showDownloadSuccess && (
              <span className="billing-download-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
            )}
            {!showDownloadSuccess && <span className="billing-download-progress" aria-hidden="true" />}
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default Billing;

const HeaderField = memo(function HeaderField({ label, value, readonly, type = "text", placeholder, onChange }) {
    return (
        <div className="flex flex-col">
      <label className="text-[11px] font-semibold billing-label mb-1 uppercase">{label}</label>
      <input
        type={type}
    className={`billing-input p-1.5 rounded text-sm outline-none px-3 ${readonly ? 'billing-input-readonly font-semibold' : 'uppercase font-medium'}`}
        value={value}
        readOnly={readonly}
        placeholder={placeholder}
        onChange={(e) => onChange && onChange(e.target.value)}
      />
        </div>
    );
});

const T = memo(function T({ label, value, onChange, readonly, accent, highlight }) {
    return (
        <div className="flex flex-col">
    <label className="text-[10px] font-semibold billing-label uppercase mb-1 leading-tight">{label}</label>
      <input type="number" className={`billing-input p-2 rounded text-sm font-semibold outline-none ${readonly ? 'billing-input-readonly' : 'billing-focus-accent'} ${accent ? 'billing-text-accent' : highlight ? 'billing-text-highlight' : 'billing-text-secondary'}`} value={readonly ? (value||0).toFixed(2) : value} onChange={e => onChange && onChange(parseFloat(e.target.value) || 0)} readOnly={readonly} />
        </div>
    );
});

const H = memo(function H({ title, items, activeId, onSelect, display }) {
   return (
      <div className="space-y-3">
        <h3 className="billing-pill-title text-[11px] font-black border-b-2 inline-block tracking-widest uppercase pb-0.5">{title}</h3>
         <div className="flex flex-wrap gap-1.5 mt-2">
            {items.map(it => (
            <button key={it._id} onClick={() => onSelect(it)} className={`billing-pill px-4 py-2 rounded-full text-[10px] font-black border transition-all ${activeId === it._id ? 'billing-pill-active shadow-md' : ''}`}>{display ? display(it) : it.name}</button>
            ))}
         </div>
      </div>
   );
});