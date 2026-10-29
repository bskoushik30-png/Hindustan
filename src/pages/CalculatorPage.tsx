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
  FileText,
  Phone,
  MapPin,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
  X
} from 'lucide-react';
import type { MeasurementItem, MeasurementSheet, BusinessSettings } from '../types';
import { SummaryCards } from '../components/SummaryCards';
import { MeasurementTable } from '../components/MeasurementTable';
import { ConfirmModal } from '../components/ConfirmModal';
import { ProformaInvoiceModal } from '../components/ProformaInvoiceModal';
import { calculateTotals, formatValue } from '../utils/calculator';
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

  // Step Wizard State (1: Daily Measurements, 2: Customer Details, 3: Review & Invoice)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Sheet Metadata State
  const [sheetId, setSheetId] = useState<string>(sheetToEdit?.id || generateId());
  const [sheetName, setSheetName] = useState<string>(sheetToEdit?.sheetName || 'Daily Timber Tally Sheet');
  const [customerName, setCustomerName] = useState<string>(sheetToEdit?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(sheetToEdit?.customerPhone || '');
  const [customerAddress, setCustomerAddress] = useState<string>(sheetToEdit?.customerAddress || '');
  const [projectName, setProjectName] = useState<string>(sheetToEdit?.projectName || '');
  const [referenceNumber, setReferenceNumber] = useState<string>(
    sheetToEdit?.referenceNumber || `REF-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [measurementDate, setMeasurementDate] = useState<string>(
    sheetToEdit?.measurementDate || new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>(sheetToEdit?.notes || '');

  // Measurement Items State
  const [items, setItems] = useState<MeasurementItem[]>(
    sheetToEdit?.items && sheetToEdit.items.length > 0 ? sheetToEdit.items : []
  );

  // Status & Feedback State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isProformaModalOpen, setIsProformaModalOpen] = useState(false);
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const isInitialMount = useRef(true);

  // Sync state if sheetToEdit prop changes
  useEffect(() => {
    if (sheetToEdit) {
      setSheetId(sheetToEdit.id);
      setSheetName(sheetToEdit.sheetName);
      setCustomerName(sheetToEdit.customerName || '');
      setCustomerPhone(sheetToEdit.customerPhone || '');
      setCustomerAddress(sheetToEdit.customerAddress || '');
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
      customerPhone,
      customerAddress,
      projectName,
      referenceNumber,
      measurementDate,
      notes,
      items
    };
    dbService.saveDraft(draftSheet);
  }, [sheetName, customerName, customerPhone, customerAddress, projectName, referenceNumber, measurementDate, notes, items, sheetId]);

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
      customerPhone,
      customerAddress,
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
      setIsActionsModalOpen(false);
    }
  };

  // Clear all measurement rows
  const handleClearAll = () => {
    setItems([]);
    setIsClearModalOpen(false);
    setIsActionsModalOpen(false);
  };

  // Create new clean sheet
  const handleNewCleanSheet = () => {
    setSheetId(generateId());
    setSheetName('Daily Timber Tally Sheet');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setProjectName('');
    setReferenceNumber(`REF-${Math.floor(100000 + Math.random() * 900000)}`);
    setMeasurementDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setItems([]);
    setCurrentStep(1);
    setSaveStatus('unsaved');
    dbService.clearDraft();
    setIsActionsModalOpen(false);
  };

  // Export handlers
  const handleExportCsv = () => {
    const current = getCurrentSheetObject();
    exportSheetToCsv(current, businessSettings);
    setIsActionsModalOpen(false);
  };

  const handleExportPdf = () => {
    const current = getCurrentSheetObject();
    exportSheetToPdf(current, businessSettings);
    setIsActionsModalOpen(false);
  };

  const handlePrint = () => {
    setIsActionsModalOpen(false);
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Header Toolbar (Sheet Title, Status, and Single "Actions" Button) */}
      <div
        className="no-print calc-top-toolbar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: 'var(--bg-card)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'nowrap'
        }}
      >
        {/* Left: Sheet Title & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
          <input
            type="text"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              backgroundColor: 'transparent',
              border: '1px dashed transparent',
              padding: '0.2rem 0.4rem',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              minWidth: 0,
              width: '100%',
              maxWidth: '300px'
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--primary-500)')}
            onBlur={(e) => (e.target.style.borderColor = 'transparent')}
            title="Click to rename sheet"
          />

          {/* Status Badge */}
          <div style={{ flexShrink: 0 }}>
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
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#b45309', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                title="You have unsaved changes"
              >
                <AlertTriangle size={12} /> Unsaved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#dc2626' }}>
                Save Failed
              </span>
            )}
          </div>
        </div>

        {/* Right: Dedicated Single "Actions" Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setIsActionsModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 700,
              padding: '0.45rem 0.85rem'
            }}
            title="Sheet Actions Menu: Save, Invoice, PDF, Print, CSV"
          >
            <SlidersHorizontal size={15} />
            <span>Actions ▾</span>
          </button>
        </div>
      </div>

      {/* 2. Step-by-Step Process Navigation Tabs (Step 1 -> Step 2 -> Step 3) */}
      <div className="calc-steps-nav no-print">
        <button
          type="button"
          className={`calc-step-tab ${currentStep === 1 ? 'active' : ''}`}
          onClick={() => setCurrentStep(1)}
        >
          <span className="step-num">1</span>
          <span className="step-label">Daily Measurements</span>
          {items.length > 0 && <span className="step-badge">{items.length} lines</span>}
        </button>

        <span className="step-arrow">&rarr;</span>

        <button
          type="button"
          className={`calc-step-tab ${currentStep === 2 ? 'active' : ''}`}
          onClick={() => setCurrentStep(2)}
        >
          <span className="step-num">2</span>
          <span className="step-label">Customer Details</span>
          {customerName && <span className="step-badge ok">✓</span>}
        </button>

        <span className="step-arrow">&rarr;</span>

        <button
          type="button"
          className={`calc-step-tab ${currentStep === 3 ? 'active' : ''}`}
          onClick={() => setCurrentStep(3)}
        >
          <span className="step-num">3</span>
          <span className="step-label">Review &amp; Invoice</span>
        </button>
      </div>

      {/* Feedback error alert */}
      {errorMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--danger-400)',
            fontSize: '0.88rem'
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* =========================================================================
          STEP 1: TIMBER MEASUREMENT DAILY SECTION (SHOWN FIRST & FIXED ON PHONE)
          ========================================================================= */}
      {currentStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Quick Summary Totals Header */}
          <SummaryCards totals={totals} />

          {/* Measurement Tally Card with Quick Dimension Entry & Zero-Scroll Table */}
          <div className="card calc-table-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--text-main)', fontWeight: 800 }}>
                  Timber Measurement Daily Tally
                </h3>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  CFT = (Length &times; Width &times; Thickness &times; Pieces) &divide; 144
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge" style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-800)', border: '1px solid var(--primary-200)', fontSize: '0.75rem' }}>
                  Total: {formatValue(totals.totalCft, 3)} CFT
                </span>
              </div>
            </div>

            {/* Measurement Table (Responsive: Fixed 100% width on mobile, full sheet on desktop) */}
            <MeasurementTable
              items={items}
              onChange={(newItems) => setItems(newItems)}
              sqftConvention={businessSettings?.sqftFormulaType}
            />

            {/* Step 1 Footer CTA: Proceed to Customer Details */}
            <div className="step-footer-cta no-print">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => setCurrentStep(2)}
                style={{ width: '100%', maxWidth: '420px', justifyContent: 'center', fontWeight: 800 }}
              >
                Next: Enter Customer Details ({customerName ? customerName : 'Add Buyer Info'}) <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 2: CUSTOMER DETAILS (NAME, PHONE NUMBER, ADDRESS, SITE, REF, DATE)
          ========================================================================= */}
      {currentStep === 2 && (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-main)', fontWeight: 800 }}>
              Customer &amp; Delivery Information
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Enter buyer details, contact phone number, and delivery site address for certified billing
            </p>
          </div>

          <div className="calc-customer-grid">
            {/* 1. Customer / Buyer Name */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                <User size={14} color="var(--primary-600)" /> Customer / Buyer Name:
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. New India Saw Mill / David Miller"
                required
              />
            </div>

            {/* 2. Customer Phone Number */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                <Phone size={14} color="var(--primary-600)" /> Contact Phone Number:
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
              />
            </div>

            {/* 3. Customer Address */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                <MapPin size={14} color="var(--primary-600)" /> Delivery / Billing Address:
              </label>
              <textarea
                rows={2}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="e.g. Sy. No. 10/7 Khata No. 27/2, Industrial Suburb 2nd Stage, Bengaluru, Karnataka"
              />
            </div>

            {/* 4. Project / Site */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                <Building size={14} color="var(--primary-600)" /> Project / Site Name:
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Timber Framing Lot #4"
              />
            </div>

            {/* 5. Reference Number */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                <Hash size={14} color="var(--primary-600)" /> Reference Number:
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. REF-261026"
              />
            </div>

            {/* 6. Measurement Date */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                <Calendar size={14} color="var(--primary-600)" /> Measurement Date:
              </label>
              <input
                type="date"
                value={measurementDate}
                onChange={(e) => setMeasurementDate(e.target.value)}
              />
            </div>

            {/* 7. Notes */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Optional Instructions &amp; Delivery Notes:
              </label>
              <input
                type="text"
                placeholder="e.g. Sawn to size, kiln dried, inspected for grade A quality"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Step 2 Footer Navigation */}
          <div className="step-footer-nav no-print">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCurrentStep(1)}
              style={{ fontWeight: 600 }}
            >
              <ArrowLeft size={16} /> Back to Measurements
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCurrentStep(3)}
              style={{ fontWeight: 800 }}
            >
              Next: Review &amp; Actions <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 3: REVIEW, SAVE, PROFORMA INVOICE & EXPORT
          ========================================================================= */}
      {currentStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Sheet Summary Card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', margin: '0 0 1rem', color: 'var(--text-main)', fontWeight: 800 }}>
              Tally &amp; Billing Summary
            </h3>

            <div className="calc-summary-preview-grid">
              <div className="summary-preview-item">
                <span className="preview-label">Customer / Buyer:</span>
                <span className="preview-val font-bold">{customerName || 'Walk-in / Cash Customer'}</span>
              </div>
              <div className="summary-preview-item">
                <span className="preview-label">Phone:</span>
                <span className="preview-val">{customerPhone || 'Not provided'}</span>
              </div>
              <div className="summary-preview-item">
                <span className="preview-label">Address:</span>
                <span className="preview-val">{customerAddress || 'Local Mill Pickup'}</span>
              </div>
              <div className="summary-preview-item">
                <span className="preview-label">Reference No:</span>
                <span className="preview-val font-mono">{referenceNumber}</span>
              </div>
              <div className="summary-preview-item">
                <span className="preview-label">Measurement Date:</span>
                <span className="preview-val">{measurementDate}</span>
              </div>
              <div className="summary-preview-item">
                <span className="preview-label">Total Volume:</span>
                <span className="preview-val font-bold" style={{ color: 'var(--primary-700)', fontSize: '1.1rem' }}>
                  {formatValue(totals.totalCft, 3)} CFT
                </span>
              </div>
              <div className="summary-preview-item">
                <span className="preview-label">Total Pieces:</span>
                <span className="preview-val font-bold">{totals.totalPieces} Pcs</span>
              </div>
              <div className="summary-preview-item">
                <span className="preview-label">Total Area:</span>
                <span className="preview-val font-bold" style={{ color: 'var(--amber-600)' }}>
                  {formatValue(totals.totalSqft, 3)} SQFT
                </span>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '1rem', margin: '0 0 1rem', color: 'var(--text-main)', fontWeight: 700 }}>
              Export, Invoice &amp; Save
            </h4>

            <div className="calc-step3-actions">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => setIsProformaModalOpen(true)}
                style={{
                  gridColumn: '1 / -1',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  padding: '0.85rem'
                }}
              >
                <FileText size={20} /> View / Print Proforma Invoice (Tally Format)
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                style={{ justifyContent: 'center' }}
              >
                <Save size={16} /> {saveStatus === 'saving' ? 'Saving...' : 'Save to Cloud DB'}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleExportPdf}
                style={{ justifyContent: 'center' }}
              >
                <FileDown size={16} /> Download PDF Tally
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePrint}
                style={{ justifyContent: 'center' }}
              >
                <Printer size={16} /> Print Sheet
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleExportCsv}
                style={{ justifyContent: 'center' }}
              >
                <Share2 size={16} /> Export CSV
              </button>
            </div>

            <div className="step-footer-nav no-print" style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentStep(2)}
                style={{ fontWeight: 600 }}
              >
                <ArrowLeft size={16} /> Back to Customer Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          QUICK ACTIONS DRAWER / MODAL (TRIGGERED FROM THE SINGLE TOP "ACTIONS" BUTTON)
          ========================================================================= */}
      {isActionsModalOpen && (
        <div className="modal-overlay" onClick={() => setIsActionsModalOpen(false)}>
          <div
            className="modal-content actions-sheet-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '1.25rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <SlidersHorizontal size={18} color="var(--primary-600)" />
                <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 800 }}>Sheet Actions</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsActionsModalOpen(false)}
                style={{ padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="actions-menu-list">
              <button
                type="button"
                className="action-menu-item primary"
                onClick={() => {
                  setIsActionsModalOpen(false);
                  setIsProformaModalOpen(true);
                }}
              >
                <FileText size={18} />
                <div>
                  <strong>Proforma Invoice</strong>
                  <p>View &amp; print Tally industrial invoice</p>
                </div>
              </button>

              <button
                type="button"
                className="action-menu-item"
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
              >
                <Save size={18} />
                <div>
                  <strong>Save Sheet</strong>
                  <p>{saveStatus === 'saved' ? 'All changes saved' : 'Save draft to database'}</p>
                </div>
              </button>

              <button
                type="button"
                className="action-menu-item"
                onClick={handleExportPdf}
              >
                <FileDown size={18} />
                <div>
                  <strong>Download PDF</strong>
                  <p>Certified timber measurement tally report</p>
                </div>
              </button>

              <button
                type="button"
                className="action-menu-item"
                onClick={handlePrint}
              >
                <Printer size={18} />
                <div>
                  <strong>Print Sheet</strong>
                  <p>Send tally report to printer</p>
                </div>
              </button>

              <button
                type="button"
                className="action-menu-item"
                onClick={handleExportCsv}
              >
                <Share2 size={18} />
                <div>
                  <strong>Export CSV</strong>
                  <p>Excel-compatible tally table data</p>
                </div>
              </button>

              <button
                type="button"
                className="action-menu-item"
                onClick={handleNewCleanSheet}
              >
                <FilePlus size={18} />
                <div>
                  <strong>New Clean Sheet</strong>
                  <p>Start a new blank tally</p>
                </div>
              </button>

              <button
                type="button"
                className="action-menu-item danger"
                onClick={() => {
                  setIsActionsModalOpen(false);
                  setIsClearModalOpen(true);
                }}
                disabled={items.length === 0}
              >
                <Trash2 size={18} />
                <div>
                  <strong>Clear All Measurements</strong>
                  <p>Remove all rows from this sheet</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

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
