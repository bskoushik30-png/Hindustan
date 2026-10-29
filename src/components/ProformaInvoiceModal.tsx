import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, RotateCcw, Copy, Sparkles, FileText, Check } from 'lucide-react';
import type { MeasurementSheet, BusinessSettings } from '../types';
import { numberToIndianCurrencyWords, formatIndianCurrency } from '../utils/indianNumberWords';
import './ProformaInvoice.css';

export interface ProformaInvoiceProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: MeasurementSheet | null;
  businessSettings?: BusinessSettings;
}

export interface InvoiceItemRow {
  slNo: number;
  description: string;
  hsn: string;
  cft: number;
  pieces: number;
  rate: number;
  per: string;
  discPercent: string;
  amount: number;
}

const STORAGE_KEY = 'timberpro_invoice_meta_draft';

function formatToInvoiceDate(dateStr?: string): string {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(d.getTime())) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  } catch {
    return '';
  }
}

// Sample from photo for quick reference
const SAMPLE_PHOTO_ITEMS: InvoiceItemRow[] = [
  { slNo: 1, description: '9X5X3 MAHAGONY', hsn: '4407', cft: 9.3750, pieces: 10, rate: 1200.00, per: 'CFT', discPercent: '', amount: 11250.00 },
  { slNo: 2, description: '8X5X3 MAHAGONY', hsn: '4407', cft: 41.6650, pieces: 50, rate: 1200.00, per: 'CFT', discPercent: '', amount: 49998.00 },
  { slNo: 3, description: '7X5X3 MAHAGONY', hsn: '4407', cft: 364.5500, pieces: 500, rate: 1200.00, per: 'CFT', discPercent: '', amount: 437460.00 },
  { slNo: 4, description: '6X5X3 MAHAGONY', hsn: '4407', cft: 15.6250, pieces: 25, rate: 1200.00, per: 'CFT', discPercent: '', amount: 18750.00 },
  { slNo: 5, description: '5X5X3 MAHAGONY', hsn: '4407', cft: 13.0200, pieces: 25, rate: 1200.00, per: 'CFT', discPercent: '', amount: 15624.00 },
  { slNo: 6, description: '4X5X3 MAHAGONY', hsn: '4407', cft: 31.2450, pieces: 75, rate: 1200.00, per: 'CFT', discPercent: '', amount: 37494.00 },
  { slNo: 7, description: '4.5X5X3 MAHAGONY', hsn: '4407', cft: 35.1525, pieces: 75, rate: 1200.00, per: 'CFT', discPercent: '', amount: 42183.00 },
  { slNo: 8, description: '3.5X5X3 MAHAGONY', hsn: '4407', cft: 9.1125, pieces: 25, rate: 1200.00, per: 'CFT', discPercent: '', amount: 10935.00 },
  { slNo: 9, description: '3X5X3 MAHAGONY', hsn: '4407', cft: 4.6875, pieces: 15, rate: 1200.00, per: 'CFT', discPercent: '', amount: 5625.00 },
  { slNo: 10, description: '7X6X4 MAHAGONY', hsn: '4407', cft: 34.9980, pieces: 30, rate: 1250.00, per: 'CFT', discPercent: '', amount: 43747.50 },
  { slNo: 11, description: '8X6X4 MAHAGONY', hsn: '4407', cft: 39.9900, pieces: 30, rate: 1250.00, per: 'CFT', discPercent: '', amount: 49987.50 }
];

export const ProformaInvoiceModal: React.FC<ProformaInvoiceProps> = ({
  isOpen,
  onClose,
  sheet,
  businessSettings
}) => {
  const [useSampleData, setUseSampleData] = useState(false);
  const [copiedShipTo, setCopiedShipTo] = useState(false);

  // Initialize editable fields with sensible blanks or sheet data
  const initialInvoiceNo = sheet?.referenceNumber?.replace('REF-', '') || '';
  const initialInvoiceDate = formatToInvoiceDate(sheet?.measurementDate);

  const savedDraft = useMemo(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }, []);

  // All metadata fields are direct state, ready for the user to type in
  const [invoiceNo, setInvoiceNo] = useState(initialInvoiceNo);
  const [eWayBillNo, setEWayBillNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(initialInvoiceDate);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [paymentTerms, setPaymentTerms] = useState(savedDraft.paymentTerms || '');
  const [refNoAndDate, setRefNoAndDate] = useState(sheet?.referenceNumber || '');
  const [otherReferences, setOtherReferences] = useState('');
  const [buyerOrderNo, setBuyerOrderNo] = useState('');
  const [buyerOrderDate, setBuyerOrderDate] = useState('');
  const [dispatchDocNo, setDispatchDocNo] = useState('');
  const [deliveryNoteDate, setDeliveryNoteDate] = useState('');
  const [dispatchedThrough, setDispatchedThrough] = useState(savedDraft.dispatchedThrough || '');
  const [destination, setDestination] = useState('');
  const [billOfLadingNo, setBillOfLadingNo] = useState('');
  const [motorVehicleNo, setMotorVehicleNo] = useState('');
  const [termsOfDelivery, setTermsOfDelivery] = useState(savedDraft.termsOfDelivery || '');

  // Consignee (Ship to)
  const [consigneeName, setConsigneeName] = useState(sheet?.customerName || '');
  const [consigneeAddress, setConsigneeAddress] = useState(sheet?.customerAddress || '');
  const [consigneeGstin, setConsigneeGstin] = useState('');
  const [consigneeState, setConsigneeState] = useState('');
  const [consigneeStateCode, setConsigneeStateCode] = useState('');

  // Buyer (Bill to)
  const [buyerName, setBuyerName] = useState(sheet?.customerName || '');
  const [buyerAddress, setBuyerAddress] = useState(sheet?.customerAddress || '');
  const [buyerGstin, setBuyerGstin] = useState('');
  const [buyerState, setBuyerState] = useState('');
  const [buyerStateCode, setBuyerStateCode] = useState('');

  // Default global rate per CFT
  const [globalRate, setGlobalRate] = useState<number>(businessSettings?.ratePerCft || 1200);

  // Custom per-item rates map: index -> rate
  const [customRates, setCustomRates] = useState<Record<number, number>>({});
  // Custom per-item HSN map: index -> HSN
  const [customHsn, setCustomHsn] = useState<Record<number, string>>({});
  // Custom per-item discount map: index -> discount
  const [customDisc, setCustomDisc] = useState<Record<number, string>>({});

  // Bank details (pre-filled with company bank, but editable)
  const [bankHolder, setBankHolder] = useState(savedDraft.bankHolder || 'HINDUSTAN SAW MILLS AND WOOD INDUSTRIES 2024-25');
  const [bankName, setBankName] = useState(savedDraft.bankName || 'ICICI BANK');
  const [bankAccountNo, setBankAccountNo] = useState(savedDraft.bankAccountNo || '464205000153');
  const [bankIfsc, setBankIfsc] = useState(savedDraft.bankIfsc || 'JP NAGAR & ICIC0004642');

  // Save changes to localStorage draft
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          paymentTerms,
          dispatchedThrough,
          termsOfDelivery,
          bankHolder,
          bankName,
          bankAccountNo,
          bankIfsc
        })
      );
    } catch {
      // ignore
    }
  }, [paymentTerms, dispatchedThrough, termsOfDelivery, bankHolder, bankName, bankAccountNo, bankIfsc]);

  // One-click copy Consignee to Buyer
  const handleCopyShipToBillTo = () => {
    setBuyerName(consigneeName);
    setBuyerAddress(consigneeAddress);
    setBuyerGstin(consigneeGstin);
    setBuyerState(consigneeState);
    setBuyerStateCode(consigneeStateCode);
    setCopiedShipTo(true);
    setTimeout(() => setCopiedShipTo(false), 2000);
  };

  // Reset to clean blank fields
  const handleClearAllFields = () => {
    setInvoiceNo('');
    setEWayBillNo('');
    setInvoiceDate(formatToInvoiceDate());
    setDeliveryNote('');
    setPaymentTerms('');
    setRefNoAndDate('');
    setOtherReferences('');
    setBuyerOrderNo('');
    setBuyerOrderDate('');
    setDispatchDocNo('');
    setDeliveryNoteDate('');
    setDispatchedThrough('');
    setDestination('');
    setBillOfLadingNo('');
    setMotorVehicleNo('');
    setTermsOfDelivery('');
    setConsigneeName('');
    setConsigneeAddress('');
    setConsigneeGstin('');
    setConsigneeState('');
    setConsigneeStateCode('');
    setBuyerName('');
    setBuyerAddress('');
    setBuyerGstin('');
    setBuyerState('');
    setBuyerStateCode('');
    setCustomRates({});
    setCustomHsn({});
    setCustomDisc({});
    setUseSampleData(false);
  };

  // Load photo sample
  const handleLoadPhotoSample = () => {
    setInvoiceNo('8');
    setEWayBillNo('');
    setInvoiceDate('26-Oct-26');
    setDeliveryNote('');
    setPaymentTerms('IMMIDIEATE PAYMENT');
    setRefNoAndDate('');
    setOtherReferences('');
    setBuyerOrderNo('');
    setBuyerOrderDate('');
    setDispatchDocNo('');
    setDeliveryNoteDate('');
    setDispatchedThrough('ROAD');
    setDestination('BANGLORE');
    setBillOfLadingNo('dt. 26-Oct-26');
    setMotorVehicleNo('');
    setTermsOfDelivery('TRANSPORTATION EXTRA\nAPPLICABLE GST EXTRA');

    const sampleAddr = 'Sy.No.10/7 Khata No.27/2/100/10/7, Sir M\nVishveshwaraiah Layout, 3rd Block, Bengaluru, Near\nNammoora Thindi, Bengaluru Urban';
    setConsigneeName('New India Saw Mill');
    setConsigneeAddress(sampleAddr);
    setConsigneeGstin('29CJZPK3158H1ZG');
    setConsigneeState('Karnataka');
    setConsigneeStateCode('29');

    setBuyerName('New India Saw Mill');
    setBuyerAddress(sampleAddr);
    setBuyerGstin('29CJZPK3158H1ZG');
    setBuyerState('Karnataka');
    setBuyerStateCode('29');

    setGlobalRate(1200);
    setUseSampleData(true);
  };

  // Build items list from active tally sheet (or sample)
  const invoiceItems: InvoiceItemRow[] = useMemo(() => {
    if (useSampleData || !sheet || !sheet.items || sheet.items.length === 0) {
      if (useSampleData) {
        return SAMPLE_PHOTO_ITEMS;
      }
    }

    const sourceItems = sheet?.items && sheet.items.length > 0 ? sheet.items : [];

    return sourceItems
      .filter((it) => (typeof it.lengthFeet === 'number' && it.lengthFeet > 0 && typeof it.pieces === 'number' && it.pieces > 0))
      .map((it, idx) => {
        const rate = customRates[idx] ?? globalRate;
        const hsn = customHsn[idx] ?? '4407';
        const disc = customDisc[idx] ?? '';
        const l = it.lengthFeet;
        const w = it.widthInches;
        const t = it.thicknessInches;
        const wood = (it.woodType || 'TIMBER').toUpperCase();
        const desc = `${l}X${w}X${t} ${wood}`;
        const cft = it.cft;
        const pcs = typeof it.pieces === 'number' ? it.pieces : 0;
        const amount = Math.round(cft * rate * 100) / 100;

        return {
          slNo: idx + 1,
          description: desc,
          hsn,
          cft,
          pieces: pcs,
          rate,
          per: 'CFT',
          discPercent: disc,
          amount
        };
      });
  }, [sheet, useSampleData, customRates, customHsn, customDisc, globalRate]);

  // Aggregate Totals
  const { totalCft, totalPieces, totalAmount } = useMemo(() => {
    let cftSum = 0;
    let pcsSum = 0;
    let amtSum = 0;

    for (const it of invoiceItems) {
      cftSum += it.cft;
      pcsSum += it.pieces;
      amtSum += it.amount;
    }

    return {
      totalCft: cftSum,
      totalPieces: pcsSum,
      totalAmount: amtSum
    };
  }, [invoiceItems]);

  const amountInWords = useMemo(() => {
    return numberToIndianCurrencyWords(totalAmount);
  }, [totalAmount]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('proforma-modal-open');
    } else {
      document.body.classList.remove('proforma-modal-open');
    }
    return () => {
      document.body.classList.remove('proforma-modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="proforma-modal-overlay">
      {/* Top Floating Control Bar (Hidden in Print) */}
      <div className="proforma-toolbar no-print">
        <div className="proforma-toolbar-left">
          <FileText size={20} className="text-emerald-400" />
          <span className="proforma-toolbar-title">
            Proforma Invoice &bull; Direct In-Place Editing
          </span>
          <span className="badge badge-connected" style={{ marginLeft: '6px' }}>
            A4 Print-Ready
          </span>
        </div>

        <div className="proforma-toolbar-right">
          {/* Quick Rate Batch Setter */}
          <div className="rate-quick-setter" title="Apply a default rate per CFT across all rows">
            <span style={{ fontSize: '0.75rem', color: '#b7e4c7', fontWeight: 600 }}>Rate/CFT: ₹</span>
            <input
              type="number"
              className="rate-batch-input"
              value={globalRate}
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                setGlobalRate(val);
                setCustomRates({});
              }}
            />
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCopyShipToBillTo}
            title="Copy Consignee details to Buyer"
          >
            {copiedShipTo ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copiedShipTo ? 'Copied!' : 'Ship to ➔ Bill to'}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleLoadPhotoSample}
            title="Load sample photo data (New India Saw Mill, 11 Mahogany items)"
          >
            <Sparkles size={14} /> Sample
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleClearAllFields}
            title="Clear all fields to blank"
          >
            <RotateCcw size={14} /> Clear
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handlePrint}
            title="Print or Save as PDF"
          >
            <Printer size={15} /> Print / Save PDF
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            title="Close Preview"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Printable A4 Document Container */}
      <div className="proforma-document-container">
        <div className="proforma-box">

          {/* 1. Header Box */}
          <div className="p-header-title">
            PROFORMA INVOICE
          </div>

          {/* 2. Top Grid: Left (Seller + Consignee + Buyer) | Right (Dispatch Table) */}
          <div className="p-top-grid">
            
            {/* Left Column (50%) */}
            <div className="p-left-col">
              {/* Seller Sub-box */}
              <div className="p-seller-box">
                <div className="p-seller-logo">
                  <img
                    src="/logo-icon-transparent.png"
                    alt="Logo"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/logo-icon.png';
                    }}
                  />
                </div>
                <div className="p-seller-details">
                  <div className="p-seller-name">
                    {businessSettings?.companyName || 'HINDUSTAN SAW MILLS AND WOOD INDUSTRIES'}
                  </div>
                  <div className="p-seller-line">#99/C INDUSTRIAL SUBURB 2ND STAGE</div>
                  <div className="p-seller-line">VISHVESHWARA NAGAR MYSOREE - 570008</div>
                  <div className="p-seller-line">ACCOUNTS DEPARTMENT - 7996222901</div>
                  <div className="p-seller-line">
                    <strong>GSTIN/UIN:</strong> 29APYPK6256P1ZL
                  </div>
                  <div className="p-seller-line">
                    State Name : Karnataka, Code : 29
                  </div>
                  <div className="p-seller-line">
                    E-Mail : hindustansawmill@gmail.com
                  </div>
                </div>
              </div>

              {/* Consignee (Ship to) - Editable In-Place */}
              <div className="p-party-box">
                <div className="p-party-heading">Consignee (Ship to)</div>
                <input
                  type="text"
                  className="p-input p-party-name-input"
                  value={consigneeName}
                  onChange={(e) => setConsigneeName(e.target.value)}
                  placeholder="Enter Consignee / Firm Name"
                />
                <textarea
                  className="p-input p-party-addr-input no-print"
                  rows={3}
                  value={consigneeAddress}
                  onChange={(e) => setConsigneeAddress(e.target.value)}
                  placeholder="Enter Address, Street, Area, City..."
                />
                <div className="print-only p-print-preline">{consigneeAddress}</div>
                <div className="p-party-meta">
                  <span className="p-party-meta-label">GSTIN/UIN</span>
                  <span className="p-party-meta-separator">: </span>
                  <input
                    type="text"
                    className="p-input p-party-meta-input"
                    value={consigneeGstin}
                    onChange={(e) => setConsigneeGstin(e.target.value)}
                    placeholder="29XXXXXXXXXXXXX"
                  />
                </div>
                <div className="p-party-meta">
                  <span className="p-party-meta-label">State Name</span>
                  <span className="p-party-meta-separator">: </span>
                  <input
                    type="text"
                    className="p-input p-party-meta-input"
                    value={consigneeState}
                    onChange={(e) => setConsigneeState(e.target.value)}
                    placeholder="Karnataka"
                    style={{ flex: 2 }}
                  />
                  <span style={{ margin: '0 4px', alignSelf: 'center', fontSize: '8.5px' }}>Code:</span>
                  <input
                    type="text"
                    className="p-input p-party-meta-input"
                    value={consigneeStateCode}
                    onChange={(e) => setConsigneeStateCode(e.target.value)}
                    placeholder="29"
                    style={{ width: '38px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Buyer (Bill to) - Editable In-Place */}
              <div className="p-party-box" style={{ borderBottom: 'none' }}>
                <div className="p-party-heading">Buyer (Bill to)</div>
                <input
                  type="text"
                  className="p-input p-party-name-input"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Enter Buyer / Firm Name"
                />
                <textarea
                  className="p-input p-party-addr-input no-print"
                  rows={3}
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  placeholder="Enter Address, Street, Area, City..."
                />
                <div className="print-only p-print-preline">{buyerAddress}</div>
                <div className="p-party-meta">
                  <span className="p-party-meta-label">GSTIN/UIN</span>
                  <span className="p-party-meta-separator">: </span>
                  <input
                    type="text"
                    className="p-input p-party-meta-input"
                    value={buyerGstin}
                    onChange={(e) => setBuyerGstin(e.target.value)}
                    placeholder="29XXXXXXXXXXXXX"
                  />
                </div>
                <div className="p-party-meta">
                  <span className="p-party-meta-label">State Name</span>
                  <span className="p-party-meta-separator">: </span>
                  <input
                    type="text"
                    className="p-input p-party-meta-input"
                    value={buyerState}
                    onChange={(e) => setBuyerState(e.target.value)}
                    placeholder="Karnataka"
                    style={{ flex: 2 }}
                  />
                  <span style={{ margin: '0 4px', alignSelf: 'center', fontSize: '8.5px' }}>Code:</span>
                  <input
                    type="text"
                    className="p-input p-party-meta-input"
                    value={buyerStateCode}
                    onChange={(e) => setBuyerStateCode(e.target.value)}
                    placeholder="29"
                    style={{ width: '38px', textAlign: 'center' }}
                  />
                </div>
              </div>
            </div>

            {/* Right Column (50%): Metadata Grid Table - Direct Inputs */}
            <div className="p-right-col">
              {/* Row 1: Invoice No | e-Way Bill No | Dated */}
              <div className="p-meta-grid-row cols-3">
                <div className="p-meta-cell">
                  <span className="p-label">Invoice No.</span>
                  <input
                    type="text"
                    className="p-input p-val-input"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="e.g. 8"
                  />
                </div>
                <div className="p-meta-cell">
                  <span className="p-label">e-Way Bill No.</span>
                  <input
                    type="text"
                    className="p-input p-val-input"
                    value={eWayBillNo}
                    onChange={(e) => setEWayBillNo(e.target.value)}
                    placeholder="-"
                  />
                </div>
                <div className="p-meta-cell">
                  <span className="p-label">Dated</span>
                  <input
                    type="text"
                    className="p-input p-val-input"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    placeholder="DD-Mon-YY"
                  />
                </div>
              </div>

              {/* Row 2: Delivery Note | Mode/Terms of Payment */}
              <div className="p-meta-grid-row cols-2">
                <div className="p-meta-cell">
                  <span className="p-label">Delivery Note</span>
                  <input
                    type="text"
                    className="p-input p-val-input"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    placeholder="-"
                  />
                </div>
                <div className="p-meta-cell">
                  <span className="p-label">Mode/Terms of Payment</span>
                  <input
                    type="text"
                    className="p-input p-val-input"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="e.g. Immediate Payment"
                  />
                </div>
              </div>

              {/* Row 3: Reference No. & Date | Other References */}
              <div className="p-meta-grid-row cols-2">
                <div className="p-meta-cell">
                  <span className="p-label">Reference No. &amp; Date.</span>
                  <input
                    type="text"
                    className="p-input p-val-input"
                    value={refNoAndDate}
                    onChange={(e) => setRefNoAndDate(e.target.value)}
                    placeholder="-"
                  />
                </div>
                <div className="p-meta-cell">
                  <span className="p-label">Other References</span>
                  <input
                    type="text"
                    className="p-input p-val-input"
                    value={otherReferences}
                    onChange={(e) => setOtherReferences(e.target.value)}
                    placeholder="-"
                  />
                </div>
              </div>

              {/* Row 4: Buyer's Order No. | Dated */}
              <div className="p-meta-grid-row cols-2">
                <div className="p-meta-cell">
                  <span className="p-label">Buyer's Order No.</span>
                  <input
                    type="text"
                    className="p-input p-val-input"
                    value={buyerOrderNo}
                    onChange={(e) => setBuyerOrderNo(e.target.value)}
                    placeholder="-"
                  />
                </div>
                <div className="p-meta-cell">
                  <span className="p-label">Dated</span>
                  <input
                    type="text"
                    className="p-input p-val-input"
                    value={buyerOrderDate}
                    onChange={(e) => setBuyerOrderDate(e.target.value)}
                    placeholder="-"
                  />
                </div>
              </div>

              {/* Row 5: Dispatch Doc No. | Delivery Note Date */}
              <div className="p-meta-grid-row cols-2">
                <div className="p-meta-cell">
                  <span className="p-label">Dispatch Doc No.</span>
                  <input
                    type="text"
                    className="p-input p-val-input"
                    value={dispatchDocNo}
                    onChange={(e) => setDispatchDocNo(e.target.value)}
                    placeholder="-"
                  />
                </div>
                <div className="p-meta-cell">
                  <span className="p-label">Delivery Note Date</span>
                  <input
                    type="text"
                    className="p-input p-val-input"
                    value={deliveryNoteDate}
                    onChange={(e) => setDeliveryNoteDate(e.target.value)}
                    placeholder="-"
                  />
                </div>
              </div>

              {/* Row 6: Dispatched through | Destination */}
              <div className="p-meta-grid-row cols-2">
                <div className="p-meta-cell">
                  <span className="p-label">Dispatched through</span>
                  <input
                    type="text"
                    className="p-input p-val-input"
                    value={dispatchedThrough}
                    onChange={(e) => setDispatchedThrough(e.target.value)}
                    placeholder="e.g. ROAD"
                  />
                </div>
                <div className="p-meta-cell">
                  <span className="p-label">Destination</span>
                  <input
                    type="text"
                    className="p-input p-val-input"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. BANGALORE"
                  />
                </div>
              </div>

              {/* Row 7: Bill of Lading/LR-RR No. | Motor Vehicle No. */}
              <div className="p-meta-grid-row cols-2">
                <div className="p-meta-cell">
                  <span className="p-label">Bill of Lading/LR-RR No.</span>
                  <input
                    type="text"
                    className="p-input p-val-input"
                    value={billOfLadingNo}
                    onChange={(e) => setBillOfLadingNo(e.target.value)}
                    placeholder="e.g. dt. 26-Oct-26"
                  />
                </div>
                <div className="p-meta-cell">
                  <span className="p-label">Motor Vehicle No.</span>
                  <input
                    type="text"
                    className="p-input p-val-input"
                    value={motorVehicleNo}
                    onChange={(e) => setMotorVehicleNo(e.target.value)}
                    placeholder="KA-XX-XXXX"
                  />
                </div>
              </div>

              {/* Row 8: Terms of Delivery */}
              <div className="p-meta-grid-row full" style={{ borderBottom: 'none', flex: 1 }}>
                <div className="p-meta-cell">
                  <span className="p-label">Terms of Delivery</span>
                  <textarea
                    className="p-input p-val-textarea no-print"
                    rows={2}
                    value={termsOfDelivery}
                    onChange={(e) => setTermsOfDelivery(e.target.value)}
                    placeholder="e.g. TRANSPORTATION EXTRA&#10;APPLICABLE GST EXTRA"
                  />
                  <div className="print-only p-print-preline">{termsOfDelivery}</div>
                </div>
              </div>
            </div>

          </div>

          {/* 3. Items Table */}
          <div className="p-table-container">
            <table className="p-items-table">
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>Sl<br />No.</th>
                  <th style={{ width: '31%', textAlign: 'left', paddingLeft: '8px' }}>Description of Goods</th>
                  <th style={{ width: '7%' }}>HSN/SAC</th>
                  <th style={{ width: '13%', textAlign: 'right' }}>Alt. Quantity</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Quantity</th>
                  <th style={{ width: '11%', textAlign: 'right' }}>Rate</th>
                  <th style={{ width: '6%' }}>per</th>
                  <th style={{ width: '6%' }}>Disc. %</th>
                  <th style={{ width: '12%', textAlign: 'right', paddingRight: '8px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoiceItems.map((item, index) => (
                  <tr key={index} className="p-item-row">
                    <td className="text-center">{item.slNo}</td>
                    <td className="p-item-desc">{item.description}</td>
                    <td className="text-center">
                      <input
                        type="text"
                        className="p-input text-center p-mono"
                        value={item.hsn}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomHsn((prev) => ({ ...prev, [index]: val }));
                        }}
                      />
                    </td>
                    <td className="text-right p-mono">{item.cft.toFixed(4)} CFT</td>
                    <td className="text-right p-mono">{item.pieces} PCS</td>
                    <td className="text-right p-mono">
                      <input
                        type="number"
                        className="p-input text-right p-mono"
                        value={item.rate}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setCustomRates((prev) => ({ ...prev, [index]: val }));
                        }}
                      />
                    </td>
                    <td className="text-center">{item.per}</td>
                    <td className="text-center">
                      <input
                        type="text"
                        className="p-input text-center p-mono"
                        value={item.discPercent}
                        placeholder="-"
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomDisc((prev) => ({ ...prev, [index]: val }));
                        }}
                      />
                    </td>
                    <td className="text-right p-mono font-bold" style={{ paddingRight: '8px' }}>
                      {formatIndianCurrency(item.amount)}
                    </td>
                  </tr>
                ))}

                {/* Fill empty spacing to push total to bottom if few items */}
                {invoiceItems.length < 9 && (
                  <tr style={{ height: `${(9 - invoiceItems.length) * 22}px` }}>
                    <td colSpan={9} style={{ borderBottom: 'none' }}></td>
                  </tr>
                )}
              </tbody>

              {/* Total Row */}
              <tfoot>
                <tr className="p-total-row">
                  <td colSpan={2} style={{ textAlign: 'right', fontWeight: 800, paddingRight: '12px' }}>
                    Total
                  </td>
                  <td></td>
                  <td className="text-right p-mono font-bold">
                    {totalCft.toFixed(4)} CFT
                  </td>
                  <td className="text-right p-mono font-bold">
                    {totalPieces} PCS
                  </td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="text-right p-mono font-bold" style={{ paddingRight: '8px' }}>
                    ₹ {formatIndianCurrency(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 4. Amount Chargeable in Words */}
          <div className="p-words-bar">
            <div>
              <span className="p-words-label">Amount Chargeable (in words)</span>
              <div className="p-words-text">{amountInWords}</div>
            </div>
            <div className="p-eoe">E. &amp; O.E</div>
          </div>

          {/* 5. HSN/SAC Summary Section */}
          <div className="p-hsn-container">
            <div className="p-hsn-subtable-wrapper">
              <table className="p-hsn-table">
                <thead>
                  <tr>
                    <th>HSN/SAC</th>
                    <th style={{ textAlign: 'right' }}>Taxable<br />Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>4407</td>
                    <td className="text-right p-mono">{formatIndianCurrency(totalAmount)}</td>
                  </tr>
                  <tr className="p-hsn-total-row">
                    <td>Total</td>
                    <td className="text-right p-mono">{formatIndianCurrency(totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-tax-words-line">
              Tax Amount (in words) : <strong>NIL</strong>
            </div>
          </div>

          {/* 6. Bottom Grid (Terms and Conditions completely removed as requested) */}
          <div className="p-bottom-grid">
            
            {/* Left Box: Declaration + Customer Seal & Signature */}
            <div className="p-bottom-left">
              <div className="p-declaration-section">
                <div className="p-declaration-heading">Declaration</div>
                <div className="p-declaration-text">
                  We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                </div>
              </div>

              <div className="p-customer-sign-box">
                <span>Customer&apos;s Seal and Signature</span>
              </div>
            </div>

            {/* Right Box: Company Bank Details + Authorized Signatory */}
            <div className="p-bottom-right">
              <div className="p-bank-section">
                <div className="p-section-heading">Company&apos;s Bank Details</div>
                <div className="p-bank-row">
                  <span className="p-bank-label">A/c Holder&apos;s Name</span>
                  <span className="p-bank-separator">: </span>
                  <input
                    type="text"
                    className="p-input p-bank-input"
                    value={bankHolder}
                    onChange={(e) => setBankHolder(e.target.value)}
                  />
                </div>
                <div className="p-bank-row">
                  <span className="p-bank-label">Bank Name</span>
                  <span className="p-bank-separator">: </span>
                  <input
                    type="text"
                    className="p-input p-bank-input"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>
                <div className="p-bank-row">
                  <span className="p-bank-label">A/c No.</span>
                  <span className="p-bank-separator">: </span>
                  <input
                    type="text"
                    className="p-input p-bank-input"
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                  />
                </div>
                <div className="p-bank-row">
                  <span className="p-bank-label">Branch &amp; IFS Code</span>
                  <span className="p-bank-separator">: </span>
                  <input
                    type="text"
                    className="p-input p-bank-input"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-auth-sign-box">
                <div className="p-for-company">
                  for {businessSettings?.companyName || 'HINDUSTAN SAW MILLS AND WOOD INDUSTRIES'}
                </div>
                <div className="p-sign-space"></div>
                <div className="p-auth-title">Authorised Signatory</div>
              </div>
            </div>

          </div>

          {/* 7. Bottom Footnote */}
          <div className="p-computer-note">
            This is a Computer Generated Invoice
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};
