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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="table-responsive">
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
                <td colSpan={9} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <AlertCircle size={36} color="var(--primary-600)" />
                    <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                      No measurement rows yet
                    </p>
                    <p style={{ fontSize: '0.88rem', margin: 0, maxWidth: '420px' }}>
                      Use the quick-entry bar below to tally lumber or click &ldquo;Add Blank Row&rdquo;.
                      Formula: (Length &times; Width &times; Thickness &times; Pieces) &divide; 144.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleAddEmptyRow}
                      style={{ marginTop: '0.5rem' }}
                    >
                      <Plus size={16} /> Add First Row
                    </button>
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
                    {/* 1. Serial Number */}
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-subtle)' }}>
                      {item.serialNumber}
                    </td>

                    {/* 2. Wood Species / Type */}
                    <td>
                      <input
                        type="text"
                        placeholder="e.g. Teak, Pine, Sal"
                        value={item.woodType || ''}
                        onChange={(e) => handleUpdateItem(index, 'woodType', e.target.value)}
                        style={{ minWidth: '120px' }}
                      />
                    </td>

                    {/* 3. Length (Feet) */}
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

                    {/* 4. Width (Inches) */}
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

                    {/* 5. Thickness (Inches) */}
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

                    {/* 6. Pieces */}
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

                    {/* 7. Total CFT */}
                    <td className="col-numeric col-cft">
                      {formatValue(item.cft, 3)}
                    </td>

                    {/* 8. Total SQFT */}
                    <td className="col-numeric col-sqft">
                      {formatValue(item.sqft, 3)}
                    </td>

                    {/* 9. Actions */}
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

        {/* Quick Add Bottom Bar for Fast Tallying */}
        <form onSubmit={handleQuickAdd} className="quick-add-bar no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '140px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-400)', letterSpacing: '0.04em' }}>
              Quick Entry:
            </span>
            <input
              type="text"
              placeholder="Species (optional)"
              value={quickWoodType}
              onChange={(e) => setQuickWoodType(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.6rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '88px' }}>
              <input
                ref={lengthInputRef}
                type="number"
                step="any"
                min="0"
                placeholder="Length (ft)"
                className="calc-input"
                value={quickLength}
                onChange={(e) => setQuickLength(e.target.value)}
                required
              />
            </div>
            <span style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>&times;</span>
            <div style={{ width: '88px' }}>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="Width (in)"
                className="calc-input"
                value={quickWidth}
                onChange={(e) => setQuickWidth(e.target.value)}
                required
              />
            </div>
            <span style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>&times;</span>
            <div style={{ width: '88px' }}>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="Thick (in)"
                className="calc-input"
                value={quickThickness}
                onChange={(e) => setQuickThickness(e.target.value)}
                required
              />
            </div>
            <span style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>&times;</span>
            <div style={{ width: '75px' }}>
              <input
                type="number"
                step="1"
                min="1"
                placeholder="Pieces"
                className="calc-input"
                value={quickPieces}
                onChange={(e) => setQuickPieces(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary btn-sm" title="Add measurement row (Enter)">
              <CornerDownLeft size={15} /> Add Row
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddEmptyRow}
              title="Add empty blank row"
            >
              <Plus size={15} /> Blank Row
            </button>
          </div>
        </form>
      </div>

      {quickError && (
        <div style={{ fontSize: '0.82rem', color: 'var(--danger-400)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <AlertCircle size={14} /> {quickError}
        </div>
      )}
    </div>
  );
};
