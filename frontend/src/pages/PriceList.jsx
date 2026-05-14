import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import PageSEO from '../components/PageSEO';
import AppSidebar from '../components/AppSidebar';
import TopbarControls from '../components/TopbarControls';
import './PriceList.css';

export default function PriceList() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [draftPrices, setDraftPrices] = useState({});
  const [savingRowId, setSavingRowId] = useState('');
  const [bulkPercent, setBulkPercent] = useState('');
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [lastBulkChange, setLastBulkChange] = useState(null);
  const [undoingBulk, setUndoingBulk] = useState(false);

  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    loadPriceList();
  }, []);

  const loadPriceList = async () => {
    setLoading(true);
    try {
      const [catalogRes, billsRes] = await Promise.allSettled([
        API.getCatalog(),
        API.getBills(1, 300)
      ]);

      if (catalogRes.status !== 'fulfilled') {
        throw new Error('Failed to load catalog');
      }

      const catalog = await catalogRes.value.json();

      let billsPayload = { bills: [] };
      if (billsRes.status === 'fulfilled' && billsRes.value?.ok) {
        billsPayload = await billsRes.value.json();
      }

      const categories = catalog?.categories || [];
      const materials = catalog?.materials || [];
      const sizes = catalog?.sizes || [];
      const fittings = catalog?.fittings || [];
      const bills = billsPayload?.bills || [];

      const latestSellingByProduct = new Map();
      for (const bill of bills) {
        const items = bill?.items || [];
        for (const item of items) {
          const name = String(item?.productName || '').trim().toLowerCase();
          if (!name || latestSellingByProduct.has(name)) continue;
          latestSellingByProduct.set(name, item?.price);
        }
      }

      const rowsBuilt = [];
      setCategoryOptions(categories.map((c) => c.name).filter(Boolean));

      for (const material of materials) {
        const category = categories.find((c) => c._id === material?.categoryId);
        const categoryName = category?.name || '-';
        const materialName = material?.name || '-';

        const sizesForMaterial = sizes.filter((s) => s.materialId === material._id);
        const fittingsForMaterial = fittings.filter((f) => f.materialId === material._id);

        if (sizesForMaterial.length > 0 && fittingsForMaterial.length > 0) {
          for (const size of sizesForMaterial) {
            const sizeValue = size?.value || size?.size || '-';
            for (const fitting of fittingsForMaterial) {
              const fittingName = fitting?.name || '-';
              const fullProductKey = `${materialName} ${sizeValue} ${fittingName}`.trim().toLowerCase();

              rowsBuilt.push({
                id: `combo-${size._id}-${fitting._id}`,
                entityType: 'size',
                entityId: size._id,
                categoryName,
                materialName,
                fittingName,
                sizeName: sizeValue,
                buyingPrice: size?.buyingPrice ?? fitting?.buyingPrice ?? material?.buyingPrice ?? null,
                sellingPrice:
                  size?.sellingPrice ??
                  fitting?.sellingPrice ??
                  material?.sellingPrice ??
                  latestSellingByProduct.get(fullProductKey) ??
                  null
              });
            }
          }
          continue;
        }

        if (sizesForMaterial.length > 0) {
          for (const size of sizesForMaterial) {
            const sizeValue = size?.value || size?.size || '-';
            const fullProductKey = `${materialName} ${sizeValue}`.trim().toLowerCase();

            rowsBuilt.push({
              id: `size-${size._id}`,
              entityType: 'size',
              entityId: size._id,
              categoryName,
              materialName,
              fittingName: '-',
              sizeName: sizeValue,
              buyingPrice: size?.buyingPrice ?? size?.costPrice ?? material?.buyingPrice ?? null,
              sellingPrice:
                size?.sellingPrice ??
                material?.sellingPrice ??
                latestSellingByProduct.get(fullProductKey) ??
                null
            });
          }
          continue;
        }

        if (fittingsForMaterial.length > 0) {
          for (const fitting of fittingsForMaterial) {
            const fittingName = fitting?.name || '-';
            const fullProductKey = `${materialName} ${fittingName}`.trim().toLowerCase();

            rowsBuilt.push({
              id: `fitting-${fitting._id}`,
              entityType: 'fitting',
              entityId: fitting._id,
              categoryName,
              materialName,
              fittingName,
              sizeName: '-',
              buyingPrice: fitting?.buyingPrice ?? fitting?.costPrice ?? material?.buyingPrice ?? null,
              sellingPrice:
                fitting?.sellingPrice ??
                material?.sellingPrice ??
                latestSellingByProduct.get(fullProductKey) ??
                null
            });
          }
          continue;
        }

        if (sizesForMaterial.length === 0 && fittingsForMaterial.length === 0) {
          rowsBuilt.push({
            id: `material-${material._id}`,
            entityType: 'material',
            entityId: material._id,
            categoryName,
            materialName,
            fittingName: '-',
            sizeName: '-',
            buyingPrice: material?.buyingPrice ?? null,
            sellingPrice: material?.sellingPrice ?? null
          });
        }
      }

      setRows(rowsBuilt);
      const nextDrafts = {};
      for (const row of rowsBuilt) {
        nextDrafts[row.id] = {
          buyingPrice: row.buyingPrice ?? '',
          sellingPrice: row.sellingPrice ?? ''
        };
      }
      setDraftPrices(nextDrafts);
      setLastBulkChange(null);
    } catch (error) {
      console.error('Failed to load price list', error);
      setRows([]);
      setDraftPrices({});
      setLastBulkChange(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    const text = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesCategory = categoryFilter === 'all' || row.categoryName === categoryFilter;
      const line = `${row.categoryName} ${row.materialName} ${row.fittingName} ${row.sizeName}`.toLowerCase();
      const matchesSearch = !text || line.includes(text);
      return matchesCategory && matchesSearch;
    });
  }, [rows, query, categoryFilter]);

  const updateDraftPrice = (rowId, field, value) => {
    setDraftPrices((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] || {}),
        [field]: value
      }
    }));
  };

  const saveRowPrices = async (row) => {
    const draft = draftPrices[row.id] || {};
    const buyingPrice = draft.buyingPrice === '' ? null : Number(draft.buyingPrice);
    const sellingPrice = draft.sellingPrice === '' ? null : Number(draft.sellingPrice);

    if ((draft.buyingPrice !== '' && !Number.isFinite(buyingPrice)) || (draft.sellingPrice !== '' && !Number.isFinite(sellingPrice))) {
      return;
    }

    try {
      setSavingRowId(row.id);
      const res = await API.updateCatalogPrice(row.entityType, row.entityId, { buyingPrice, sellingPrice });
      if (!res.ok) {
        const payload = await res.json();
        console.error(payload?.error || 'Failed to save prices');
        return;
      }
      setRows((prev) => prev.map((r) => (
        r.entityType === row.entityType && r.entityId === row.entityId
          ? { ...r, buyingPrice, sellingPrice }
          : r
      )));
    } catch (error) {
      console.error('Failed to save row prices', error);
    } finally {
      setSavingRowId('');
    }
  };

  const hasUsablePrice = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    return Number.isFinite(Number(value));
  };

  const applyPercent = (rawValue, percent) => {
    if (!hasUsablePrice(rawValue)) return undefined;
    const base = Number(rawValue);
    const next = base * (1 + percent / 100);
    return Math.round(next * 100) / 100;
  };

  const applyPercentToFilteredRows = async () => {
    const percent = Number(bulkPercent);
    if (!Number.isFinite(percent)) return;
    if (filteredRows.length === 0) return;

    const updatesByEntity = new Map();
    const previousByEntity = new Map();
    const previousDraftByRow = {};

    const nextDrafts = { ...draftPrices };

    for (const row of filteredRows) {
      const currentDraft = draftPrices[row.id] || {};
      previousDraftByRow[row.id] = {
        buyingPrice: currentDraft.buyingPrice ?? '',
        sellingPrice: currentDraft.sellingPrice ?? ''
      };

      const currentBuying = currentDraft.buyingPrice === '' || currentDraft.buyingPrice === undefined
        ? row.buyingPrice
        : currentDraft.buyingPrice;
      const currentSelling = currentDraft.sellingPrice === '' || currentDraft.sellingPrice === undefined
        ? row.sellingPrice
        : currentDraft.sellingPrice;

      const nextBuying = applyPercent(currentBuying, percent);
      const nextSelling = applyPercent(currentSelling, percent);

      nextDrafts[row.id] = {
        buyingPrice: nextBuying === undefined ? '' : String(nextBuying.toFixed(2)),
        sellingPrice: nextSelling === undefined ? '' : String(nextSelling.toFixed(2))
      };

      const key = `${row.entityType}:${row.entityId}`;
      const existing = updatesByEntity.get(key) || {
        entityType: row.entityType,
        entityId: row.entityId
      };
      const previous = previousByEntity.get(key) || {
        entityType: row.entityType,
        entityId: row.entityId
      };

      if (nextBuying !== undefined) {
        existing.buyingPrice = nextBuying;
        if (!Object.prototype.hasOwnProperty.call(previous, 'buyingPrice')) {
          previous.buyingPrice = Number(currentBuying);
        }
      }

      if (nextSelling !== undefined) {
        existing.sellingPrice = nextSelling;
        if (!Object.prototype.hasOwnProperty.call(previous, 'sellingPrice')) {
          previous.sellingPrice = Number(currentSelling);
        }
      }

      updatesByEntity.set(key, existing);
      previousByEntity.set(key, previous);
    }

    setDraftPrices(nextDrafts);

    setBulkUpdating(true);
    try {
      const entityUpdates = Array.from(updatesByEntity.values())
        .filter((update) => Object.prototype.hasOwnProperty.call(update, 'buyingPrice') || Object.prototype.hasOwnProperty.call(update, 'sellingPrice'));

      if (entityUpdates.length === 0) {
        setBulkUpdating(false);
        return;
      }

      await Promise.all(entityUpdates.map(async (update) => {
        const payload = {};
        if (Object.prototype.hasOwnProperty.call(update, 'buyingPrice')) {
          payload.buyingPrice = update.buyingPrice;
        }
        if (Object.prototype.hasOwnProperty.call(update, 'sellingPrice')) {
          payload.sellingPrice = update.sellingPrice;
        }

        const res = await API.updateCatalogPrice(update.entityType, update.entityId, payload);

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || 'Failed to update filtered rows');
        }
      }));

      setRows((prev) => prev.map((r) => {
        const key = `${r.entityType}:${r.entityId}`;
        const update = updatesByEntity.get(key);
        if (!update) return r;
        return {
          ...r,
          buyingPrice: Object.prototype.hasOwnProperty.call(update, 'buyingPrice') ? update.buyingPrice : r.buyingPrice,
          sellingPrice: Object.prototype.hasOwnProperty.call(update, 'sellingPrice') ? update.sellingPrice : r.sellingPrice
        };
      }));

      const restoreUpdates = entityUpdates.map((update) => {
        const key = `${update.entityType}:${update.entityId}`;
        const previous = previousByEntity.get(key) || {};
        const restore = { entityType: update.entityType, entityId: update.entityId };
        if (Object.prototype.hasOwnProperty.call(update, 'buyingPrice')) {
          restore.buyingPrice = previous.buyingPrice;
        }
        if (Object.prototype.hasOwnProperty.call(update, 'sellingPrice')) {
          restore.sellingPrice = previous.sellingPrice;
        }
        return restore;
      });

      setLastBulkChange({
        restoreUpdates,
        previousDraftByRow
      });
    } catch (error) {
      console.error('Failed bulk price update', error);
    } finally {
      setBulkUpdating(false);
    }
  };

  const undoLastBulkUpdate = async () => {
    if (!lastBulkChange || !Array.isArray(lastBulkChange.restoreUpdates) || lastBulkChange.restoreUpdates.length === 0) {
      return;
    }

    setUndoingBulk(true);
    try {
      await Promise.all(lastBulkChange.restoreUpdates.map(async (update) => {
        const payload = {};
        if (Object.prototype.hasOwnProperty.call(update, 'buyingPrice')) {
          payload.buyingPrice = update.buyingPrice;
        }
        if (Object.prototype.hasOwnProperty.call(update, 'sellingPrice')) {
          payload.sellingPrice = update.sellingPrice;
        }

        const res = await API.updateCatalogPrice(update.entityType, update.entityId, payload);
        if (!res.ok) {
          const errPayload = await res.json().catch(() => ({}));
          throw new Error(errPayload?.error || 'Failed to undo bulk update');
        }
      }));

      const restoreByKey = new Map(
        lastBulkChange.restoreUpdates.map((u) => [`${u.entityType}:${u.entityId}`, u])
      );

      setRows((prev) => prev.map((r) => {
        const key = `${r.entityType}:${r.entityId}`;
        const restore = restoreByKey.get(key);
        if (!restore) return r;
        return {
          ...r,
          buyingPrice: Object.prototype.hasOwnProperty.call(restore, 'buyingPrice') ? restore.buyingPrice : r.buyingPrice,
          sellingPrice: Object.prototype.hasOwnProperty.call(restore, 'sellingPrice') ? restore.sellingPrice : r.sellingPrice
        };
      }));

      setDraftPrices((prev) => {
        const next = { ...prev };
        const previousDraftByRow = lastBulkChange.previousDraftByRow || {};
        for (const rowId of Object.keys(previousDraftByRow)) {
          next[rowId] = previousDraftByRow[rowId];
        }
        return next;
      });

      setLastBulkChange(null);
    } catch (error) {
      console.error('Failed to undo last bulk update', error);
    } finally {
      setUndoingBulk(false);
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

  return (
    <>
      <PageSEO page="priceList" />
      
    <div className="price-list-page flex h-screen overflow-hidden font-sans">
      <AppSidebar classPrefix="price-list" activeKey="price-list" />

      <main className="price-list-main-scroll flex-1 p-8 overflow-y-auto">
        <header className="price-list-topbar flex justify-between items-center p-6 rounded-2xl shadow-sm mb-8">
          <h1 className="price-list-title text-2xl font-bold">Price List</h1>
          <TopbarControls
            containerClassName="price-list-topbar-actions"
            iconButtonClassName="price-list-icon-btn"
            onLogout={handleLogout}
            rightContent={
              <button
                onClick={loadPriceList}
                className="price-list-refresh-btn px-4 py-2 rounded-xl text-sm font-bold"
              >
                Refresh
              </button>
            }
          />
        </header>

        <section className="price-list-card p-5 rounded-2xl shadow-sm mb-6 border">
          <div className="price-list-toolbar flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <p className="price-list-caption text-sm font-semibold">Price list format: Material + Fitting + Size in one row with BP and SP</p>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="price-list-search w-full md:w-56 p-2.5 rounded-xl"
              >
                <option value="all">All Categories</option>
                {categoryOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search material, fitting, or size"
                className="price-list-search w-full md:w-96 p-2.5 rounded-xl"
              />
            </div>
          </div>

          <div className="price-list-bulk-wrap mt-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <p className="price-list-bulk-note text-xs font-semibold">
              Bulk update applies only to currently filtered rows ({filteredRows.length}).
            </p>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                value={bulkPercent}
                onChange={(e) => setBulkPercent(e.target.value)}
                placeholder="Percent (e.g. 5 or -10)"
                className="price-list-search w-full md:w-56 p-2.5 rounded-xl"
                inputMode="decimal"
              />
              <button
                type="button"
                onClick={applyPercentToFilteredRows}
                className="price-list-bulk-btn px-4 py-2 rounded-xl text-sm font-bold"
                disabled={bulkUpdating || !bulkPercent.trim() || filteredRows.length === 0}
              >
                {bulkUpdating ? 'Updating...' : 'Update BP + SP %'}
              </button>
              <button
                type="button"
                onClick={undoLastBulkUpdate}
                className="price-list-undo-btn px-4 py-2 rounded-xl text-sm font-bold"
                disabled={undoingBulk || !lastBulkChange}
              >
                {undoingBulk ? 'Undoing...' : 'Undo Last % Update'}
              </button>
            </div>
          </div>
        </section>

        <section className="price-list-card rounded-2xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="price-list-table w-full text-left min-w-[1020px]">
              <thead>
                <tr>
                  <th className="p-4">Material</th>
                  <th className="p-4">Fitting</th>
                  <th className="p-4">Size</th>
                  <th className="p-4 text-right">Buying Price</th>
                  <th className="p-4 text-right">Selling Price</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="p-8 text-center italic" colSpan="6">Loading price list...</td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td className="p-8 text-center italic" colSpan="6">No items found</td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td className="p-4 font-semibold">{row.materialName}</td>
                      <td className="p-4">{row.fittingName}</td>
                      <td className="p-4">{row.sizeName}</td>
                      <td className="p-4 text-right">
                        <input
                          value={draftPrices[row.id]?.buyingPrice ?? ''}
                          onChange={(e) => updateDraftPrice(row.id, 'buyingPrice', e.target.value)}
                          className="price-list-price-input"
                          inputMode="decimal"
                          placeholder="BP"
                        />
                      </td>
                      <td className="p-4 text-right font-semibold">
                        <input
                          value={draftPrices[row.id]?.sellingPrice ?? ''}
                          onChange={(e) => updateDraftPrice(row.id, 'sellingPrice', e.target.value)}
                          className="price-list-price-input"
                          inputMode="decimal"
                          placeholder="SP"
                        />
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => saveRowPrices(row)}
                          className="price-list-save-btn"
                          disabled={savingRowId === row.id}
                        >
                          {savingRowId === row.id ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
    </>
  );
}
