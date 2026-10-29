import React, { useState, useRef } from 'react';
import { Plus, Trash2, Copy, AlertCircle, CornerDownLeft } from 'lucide-react';
import type { MeasurementItem } from '../types';
import { calculateRow, formatValue } from '../utils/calculator';
import { generateId } from '../services/db';

interface MeasurementTableProps {
  items: MeasurementItem[];
  onChange: (items: MeasurementItem[]) => void;
  sqftConvention?: 'standard_1face' | 'surface_area_2face';
}

export const MeasurementTable: React.FC<MeasurementTableProps> = ({
  items,
  onChange,
  sqftConvention = 'standard_1face'
}) => {
  // Quick Add Input State
  const [quickLength, setQuickLength] = useState<string>('');
  const [quickWidth, setQuickWidth] = useState<string>('');
  const [quickThickness, setQuickThickness] = useState<string>('');
  const [quickPieces, setQuickPieces] = useState<string>('1');
  const [quickWoodType, setQuickWoodType] = useState<string>('');
  const [quickError, setQuickError] = useState<string | null>(null);

  const lengthInputRef = useRef<HTMLInputElement>(null);

  // Handle in-place row editing
  const handleUpdateItem = (
    index: number,
    field: keyof MeasurementItem,
    rawValue: string
  ) => {
    const updated = [...items];
    const target = { ...updated[index] };

    if (field === 'woodType' || field === 'remarks') {
      target[field] = rawValue;
    } else {
      const parsed = rawValue === '' ? '' : parseFloat(rawValue);
      (target as any)[field] = isNaN(parsed as number) ? '' : parsed;

      // Recalculate row
      const calc = calculateRow(
        target.lengthFeet,
        target.widthInches,
        target.thicknessInches,
        target.pieces,
        sqftConvention
      );
      target.cft = calc.cft;
      target.sqft = calc.sqft;
    }

    updated[index] = target;
    onChange(updated);
  };

  // Duplicate an existing row
  const handleDuplicateRow = (index: number) => {
    const source = items[index];
    const duplicate: MeasurementItem = {
      ...source,
      id: generateId(),
      serialNumber: items.length + 1
    };

    const updated = [...items.slice(0, index + 1), duplicate, ...items.slice(index + 1)];
    // Re-index serial numbers
    const reindexed = updated.map((it, idx) => ({ ...it, serialNumber: idx + 1 }));
    onChange(reindexed);
  };

  // Delete a row
  const handleDeleteRow = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    const reindexed = updated.map((it, idx) => ({ ...it, serialNumber: idx + 1 }));
    onChange(reindexed);
  };

  // Add an empty row
  const handleAddEmptyRow = () => {
    const newRow: MeasurementItem = {
      id: generateId(),
      serialNumber: items.length + 1,
      lengthFeet: '',
      widthInches: '',
      thicknessInches: '',
      pieces: 1,
      cft: 0,
      sqft: 0,
      woodType: ''
    };
    onChange([...items, newRow]);
  };

  // Add row via Quick-Add Bar
  const handleQuickAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setQuickError(null);

    const l = parseFloat(quickLength);
    const w = parseFloat(quickWidth);
    const t = parseFloat(quickThickness);
    const p = parseFloat(quickPieces);

    if (isNaN(l) || l <= 0) {
      setQuickError('Length must be greater than 0 feet');
      return;
    }
    if (isNaN(w) || w <= 0) {
      setQuickError('Width must be greater than 0 inches');
      return;
    }
    if (isNaN(t) || t <= 0) {
      setQuickError('Thickness must be greater than 0 inches');
      return;
    }
    if (isNaN(p) || p <= 0) {
      setQuickError('Pieces count must be at least 1');
      return;
    }

    const calc = calculateRow(l, w, t, p, sqftConvention);

    const newItem: MeasurementItem = {
      id: generateId(),
      serialNumber: items.length + 1,
      lengthFeet: l,
      widthInches: w,
      thicknessInches: t,
      pieces: p,
      cft: calc.cft,
      sqft: calc.sqft,
      woodType: quickWoodType.trim()
    };

    onChange([...items, newItem]);

    // Keep thickness and width for rapid consecutive tallying, or clear length & pieces
    setQuickLength('');
    setQuickPieces('1');

    // Auto-refocus on length input for continuous fast entry
    setTimeout(() => {
      lengthInputRef.current?.focus();
    }, 50);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* 1. Quick Dimension Entry Form (Prominent at top for instant daily tallying) */}
      <form onSubmit={handleQuickAdd} className="quick-add-bar no-print">
        <div className="quick-add-header-title">
          <CornerDownLeft size={16} color="var(--primary-600)" />
          <span>Quick Dimension Entry:</span>
        </div>

        <div className="quick-add-dims">
          <div className="quick-dim-col">
            <label className="quick-dim-label">Length (ft)</label>
            <input
              ref={lengthInputRef}
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 10"
              className="calc-input"
              value={quickLength}
              onChange={(e) => setQuickLength(e.target.value)}
              required
            />
          </div>
          <span className="quick-dim-mult">&times;</span>
          <div className="quick-dim-col">
            <label className="quick-dim-label">Width (in)</label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 5"
              className="calc-input"
              value={quickWidth}
              onChange={(e) => setQuickWidth(e.target.value)}
              required
            />
          </div>
          <span className="quick-dim-mult">&times;</span>
          <div className="quick-dim-col">
            <label className="quick-dim-label">Thick (in)</label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 3"
              className="calc-input"
              value={quickThickness}
              onChange={(e) => setQuickThickness(e.target.value)}
              required
            />
          </div>
          <span className="quick-dim-mult">&times;</span>
          <div className="quick-dim-col">
            <label className="quick-dim-label">Pieces</label>
            <input
              type="number"
              step="1"
              min="1"
              placeholder="e.g. 20"
              className="calc-input"
              value={quickPieces}
              onChange={(e) => setQuickPieces(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="quick-add-row-bottom">
          <div className="quick-add-species">
            <input
              type="text"
              placeholder="Wood species (optional, e.g. Teak, Mahogany, Sal)"
              value={quickWoodType}
              onChange={(e) => setQuickWoodType(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
            />
          </div>

          <div className="quick-add-actions">
            <button type="submit" className="btn btn-primary btn-sm" title="Add measurement row (Enter)">
              <Plus size={16} /> Add Row
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddEmptyRow}
              title="Add empty blank row"
            >
              Blank Row
            </button>
          </div>
        </div>
      </form>

      {quickError && (
        <div style={{ fontSize: '0.82rem', color: 'var(--danger-400)', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.5rem' }}>
          <AlertCircle size={14} /> {quickError}
        </div>
      )}

      {/* 2. Desktop Full 9-Column Spreadsheet Table (Visible on Desktop / Tablets) */}
      <div className="table-responsive desktop-tally-table">
        <table className="calc-table">
          <thead>
            <tr>
              <th style={{ width: '45px', textAlign: 'center' }}>#</th>
              <th style={{ minWidth: '130px' }}>Wood Species / Type</th>
              <th style={{ minWidth: '110px', textAlign: 'right' }}>Length (Feet)</th>
              <th style={{ minWidth: '110px', textAlign: 'right' }}>Width (Inches)</th>
              <th style={{ minWidth: '110px', textAlign: 'right' }}>Thick (Inches)</th>
              <th style={{ minWidth: '95px', textAlign: 'right' }}>Pieces</th>
              <th style={{ minWidth: '120px', textAlign: 'right' }}>Total CFT</th>
              <th style={{ minWidth: '115px', textAlign: 'right' }}>Total SQFT</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <AlertCircle size={36} color="var(--primary-600)" />
                    <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                      No measurement rows yet
                    </p>
                    <p style={{ fontSize: '0.88rem', margin: 0, maxWidth: '420px' }}>
                      Enter dimensions above and click &ldquo;Add Row&rdquo; to start recording timber measurements.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const l = typeof item.lengthFeet === 'number' ? item.lengthFeet : 0;
                const w = typeof item.widthInches === 'number' ? item.widthInches : 0;
                const t = typeof item.thicknessInches === 'number' ? item.thicknessInches : 0;
                const p = typeof item.pieces === 'number' ? item.pieces : 0;
                const isRowValid = l > 0 && w > 0 && t > 0 && p > 0;

                return (
                  <tr key={item.id} style={{ opacity: isRowValid ? 1 : 0.85 }}>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-subtle)' }}>
                      {item.serialNumber}
                    </td>

                    <td>
                      <input
                        type="text"
                        placeholder="e.g. Teak, Pine, Sal"
                        value={item.woodType || ''}
                        onChange={(e) => handleUpdateItem(index, 'woodType', e.target.value)}
                        style={{ minWidth: '120px' }}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        className="calc-input"
                        value={item.lengthFeet}
                        onChange={(e) => handleUpdateItem(index, 'lengthFeet', e.target.value)}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        className="calc-input"
                        value={item.widthInches}
                        onChange={(e) => handleUpdateItem(index, 'widthInches', e.target.value)}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        className="calc-input"
                        value={item.thicknessInches}
                        onChange={(e) => handleUpdateItem(index, 'thicknessInches', e.target.value)}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        placeholder="1"
                        className="calc-input"
                        value={item.pieces}
                        onChange={(e) => handleUpdateItem(index, 'pieces', e.target.value)}
                      />
                    </td>

                    <td className="col-numeric col-cft">
                      {formatValue(item.cft, 3)}
                    </td>

                    <td className="col-numeric col-sqft">
                      {formatValue(item.sqft, 3)}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Duplicate row"
                          onClick={() => handleDuplicateRow(index)}
                          style={{ padding: '5px' }}
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Delete row"
                          onClick={() => handleDeleteRow(index)}
                          style={{ padding: '5px', color: 'var(--danger-400)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Mobile Fixed Tally View (100% width, Zero Horizontal Scrolling for Phones) */}
      <div className="mobile-tally-view">
        {items.length === 0 ? (
          <div className="mobile-empty-tally">
            <AlertCircle size={28} color="var(--primary-600)" />
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.92rem' }}>No measurement lines yet</p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Enter dimensions above and tap <strong>&ldquo;Add Row&rdquo;</strong>
            </p>
          </div>
        ) : (
          <div className="mobile-tally-list">
            <div className="mobile-tally-header-row">
              <span style={{ width: '28px', textAlign: 'center' }}>#</span>
              <span style={{ flex: 1 }}>Dimensions (L &times; W &times; T)</span>
              <span style={{ width: '45px', textAlign: 'right' }}>Pcs</span>
              <span style={{ width: '80px', textAlign: 'right' }}>CFT</span>
              <span style={{ width: '32px' }}></span>
            </div>

            {items.map((item, index) => (
              <div key={item.id} className="mobile-tally-item">
                <span className="mobile-sn">#{item.serialNumber}</span>

                <div className="mobile-dims-info">
                  <div className="mobile-dims-val">
                    <strong>{item.lengthFeet || 0}&prime;</strong> &times; {item.widthInches || 0}&Prime; &times; {item.thicknessInches || 0}&Prime;
                  </div>
                  {item.woodType && (
                    <div className="mobile-species-tag">{item.woodType}</div>
                  )}
                </div>

                <span className="mobile-pcs-val">{item.pieces || 0}</span>

                <div className="mobile-cft-val">
                  {formatValue(item.cft, 3)}
                  <span className="mobile-cft-unit">CFT</span>
                </div>

                <div className="mobile-row-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDeleteRow(index)}
                    style={{ padding: '4px', color: 'var(--danger-400)' }}
                    title="Delete row"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
