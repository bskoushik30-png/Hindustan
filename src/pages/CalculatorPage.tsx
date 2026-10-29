import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  FileDown,
  Printer,
  Trash2,
  FilePlus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Building,
  User,
  Calendar,
  Hash,
  Share2,
  FileText
} from 'lucide-react';
import type { MeasurementItem, MeasurementSheet, BusinessSettings } from '../types';
import { SummaryCards } from '../components/SummaryCards';
import { MeasurementTable } from '../components/MeasurementTable';
import { ConfirmModal } from '../components/ConfirmModal';
import { ProformaInvoiceModal } from '../components/ProformaInvoiceModal';
import { calculateTotals } from '../utils/calculator';
import { exportSheetToCsv } from '../utils/exportCsv';
import { exportSheetToPdf } from '../utils/exportPdf';
import { dbService, generateId, sanitizeAndComputeSheet } from '../services/db';
import { useAuth } from '../contexts/AuthContext';

interface CalculatorPageProps {
  sheetToEdit?: MeasurementSheet | null;
  onSaved?: (sheet: MeasurementSheet) => void;
  businessSettings?: BusinessSettings;
}

export const CalculatorPage: React.FC<CalculatorPageProps> = ({
  sheetToEdit,
  onSaved,
  businessSettings
}) => {
  const { user } = useAuth();

  // Sheet Metadata State
  const [sheetId, setSheetId] = useState<string>(sheetToEdit?.id || generateId());
  const [sheetName, setSheetName] = useState<string>(sheetToEdit?.sheetName || 'New Timber Tally Sheet');
  const [customerName, setCustomerName] = useState<string>(sheetToEdit?.customerName || '');
  const [projectName, setProjectName] = useState<string>(sheetToEdit?.projectName || '');
  const [referenceNumber, setReferenceNumber] = useState<string>(
    sheetToEdit?.referenceNumber || `REF-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [measurementDate, setMeasurementDate] = useState<string>(
    sheetToEdit?.measurementDate || new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>(sheetToEdit?.notes || '');

  // Measurement Items State - starts completely clean without any pre-existing sample data
  const [items, setItems] = useState<MeasurementItem[]>(
    sheetToEdit?.items && sheetToEdit.items.length > 0
      ? sheetToEdit.items
      : []
  );

  // Status & Feedback State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isProformaModalOpen, setIsProformaModalOpen] = useState(false);
  const isInitialMount = useRef(true);

  // Sync state if sheetToEdit prop changes
  useEffect(() => {
    if (sheetToEdit) {
      setSheetId(sheetToEdit.id);
      setSheetName(sheetToEdit.sheetName);
      setCustomerName(sheetToEdit.customerName || '');
      setProjectName(sheetToEdit.projectName || '');
      setReferenceNumber(sheetToEdit.referenceNumber || `REF-${Math.floor(100000 + Math.random() * 900000)}`);
      setMeasurementDate(sheetToEdit.measurementDate || new Date().toISOString().split('T')[0]);
      setNotes(sheetToEdit.notes || '');
      setItems(sheetToEdit.items || []);
      setSaveStatus('saved');
    }
  }, [sheetToEdit]);

  // Mark status as unsaved and backup draft to local storage on any user change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus('unsaved');

    const draftSheet: Partial<MeasurementSheet> = {
      id: sheetId,
      sheetName,
      customerName,
      projectName,
      referenceNumber,
      measurementDate,
      notes,
      items
    };
    dbService.saveDraft(draftSheet);
  }, [sheetName, customerName, projectName, referenceNumber, measurementDate, notes, items, sheetId]);

  // Unsaved changes browser prompt warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Real-time unrounded totals calculation
  const totals = calculateTotals(items, businessSettings?.sqftFormulaType);

  // Construct current full sheet object
  const getCurrentSheetObject = (): MeasurementSheet => {
    const raw: Partial<MeasurementSheet> = {
      id: sheetId,
      sheetName,
      customerName,
      projectName,
      referenceNumber,
      measurementDate,
      notes,
      items
    };
    return sanitizeAndComputeSheet(raw, user?.id || 'guest');
  };

  // Save to database
  const handleSave = async () => {
    if (!user) return;
    setSaveStatus('saving');
    setErrorMessage(null);

    const sheetObj = getCurrentSheetObject();
    const result = await dbService.saveSheet(sheetObj, user.id);

    if (result.error) {
      setSaveStatus('error');
      setErrorMessage(result.error);
    } else {
      setSaveStatus('saved');
      dbService.clearDraft();
      if (onSaved) {
        onSaved(result.sheet);
      }
    }
  };

  // Clear all measurement rows
  const handleClearAll = () => {
    setItems([]);
    setIsClearModalOpen(false);
  };

  // Create new clean sheet
  const handleNewCleanSheet = () => {
    setSheetId(generateId());
    setSheetName('New Timber Tally Sheet');
    setCustomerName('');
    setProjectName('');
    setReferenceNumber(`REF-${Math.floor(100000 + Math.random() * 900000)}`);
    setMeasurementDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setItems([]);
    setSaveStatus('unsaved');
    dbService.clearDraft();
  };

  // Export handlers
  const handleExportCsv = () => {
    const current = getCurrentSheetObject();
    exportSheetToCsv(current, businessSettings);
  };

  const handleExportPdf = () => {
    const current = getCurrentSheetObject();
    exportSheetToPdf(current, businessSettings);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Action Toolbar */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--bg-card)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {/* Left: Sheet Title & Reference */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: '260px' }}>
          <input
            type="text"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              backgroundColor: 'transparent',
              border: '1px dashed transparent',
              padding: '0.35rem 0.6rem',
              borderRadius: 'var(--radius-sm)'
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--primary-500)')}
            onBlur={(e) => (e.target.style.borderColor = 'transparent')}
            title="Click to rename sheet"
          />

          {/* Save Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {saveStatus === 'saved' && (
              <span className="badge badge-connected" title="All changes saved to database">
                <CheckCircle size={12} /> Saved
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="badge badge-demo" title="Saving changes...">
                <Clock size={12} /> Saving...
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span
                className="badge"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                title="You have unsaved changes"
              >
                <AlertTriangle size={12} /> Unsaved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                Save Failed
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions (Save, Export PDF, CSV, Print, New, Clear) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleNewCleanSheet}
            title="Start a new blank measurement sheet"
          >
            <FilePlus size={15} /> New Sheet
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExportPdf}
            title="Download PDF tally report"
          >
            <FileDown size={15} /> PDF
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsProformaModalOpen(true)}
            title="Generate & View Proforma Invoice in Industrial Tally Format"
            style={{
              borderColor: 'var(--primary-400)',
              backgroundColor: 'rgba(140, 84, 43, 0.12)',
              color: 'var(--primary-700)',
              fontWeight: 600
            }}
          >
            <FileText size={15} /> Proforma Invoice
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExportCsv}
            title="Download Excel-compatible CSV tally file"
          >
            <Share2 size={15} /> CSV
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handlePrint}
            title="Print tally sheet"
          >
            <Printer size={15} /> Print
          </button>

          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setIsClearModalOpen(true)}
            disabled={items.length === 0}
            title="Clear all rows"
          >
            <Trash2 size={15} /> Clear All
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            style={{ minWidth: '100px' }}
          >
            <Save size={15} /> {saveStatus === 'saving' ? 'Saving...' : 'Save Sheet'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--danger-400)',
            fontSize: '0.88rem'
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Sheet Metadata Form Fields */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}
      >
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            <Hash size={13} /> Reference Number:
          </label>
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="e.g. REF-10928"
          />
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            <User size={13} /> Customer Name:
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g. Apex Woodworks"
          />
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            <Building size={13} /> Project / Site:
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. Timber Framing Lot #4"
          />
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            <Calendar size={13} /> Measurement Date:
          </label>
          <input
            type="date"
            value={measurementDate}
            onChange={(e) => setMeasurementDate(e.target.value)}
          />
        </div>
      </div>

      {/* Real-Time Automatic Totals Summary Cards */}
      <SummaryCards totals={totals} />

      {/* Measurement Table with In-line editing & Quick Add */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Timber Measurement Tally</h3>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Length (Feet) &times; Width (Inches) &times; Thickness (Inches) &times; Number of Pieces
            </p>
          </div>
          <div className="no-print" style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
            Tip: Press <strong>Tab</strong> to cycle fields, <strong>Enter</strong> to quickly add row.
          </div>
        </div>

        <MeasurementTable
          items={items}
          onChange={(newItems) => setItems(newItems)}
          sqftConvention={businessSettings?.sqftFormulaType}
        />
      </div>

      {/* Optional Sheet Notes */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Sheet Notes &amp; Delivery Instructions (Optional):
        </label>
        <textarea
          rows={2}
          placeholder="e.g. Kiln-dried to 12% moisture content, inspected for grade A sawn quality..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Clear All Rows Confirmation Modal */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        title="Clear All Measurement Rows?"
        message="This will remove all measurement rows from this sheet. You can start over with a clean table."
        confirmLabel="Clear All Rows"
        isDestructive={true}
        onConfirm={handleClearAll}
        onCancel={() => setIsClearModalOpen(false)}
      />

      {/* Proforma Invoice A4 Industrial Modal */}
      <ProformaInvoiceModal
        isOpen={isProformaModalOpen}
        onClose={() => setIsProformaModalOpen(false)}
        sheet={getCurrentSheetObject()}
        businessSettings={businessSettings}
      />
    </div>
  );
};
