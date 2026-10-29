import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BusinessSettings, MeasurementSheet } from '../types';
import { formatValue } from './calculator';
import { LOGO_ICON_BASE64 } from './logoBase64';

export function exportSheetToPdf(sheet: MeasurementSheet, settings?: BusinessSettings): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const companyName = settings?.companyName || 'HINDUSTAN SAW MILL & WOOD INDUSTRIES';
  const tagline = settings?.tagline || 'Saw Mill & Wood Industries — Established Since 1971';
  const address = settings?.address || 'Hindustan Saw Mill Complex';
  const phone = settings?.phone || '+91 (0) 98765 43210';
  const email = settings?.email || 'info@hindustansawmill.com';

  // --- Top Warm Timber Brand Header ---
  doc.setFillColor(61, 38, 20); // Deep roasted espresso / timber walnut
  doc.rect(0, 0, 210, 30, 'F');

  // Draw Logo Icon
  try {
    doc.addImage(LOGO_ICON_BASE64, 'PNG', 14, 4, 22, 22);
  } catch (e) {
    console.warn('Could not draw logo on PDF:', e);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), 40, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(245, 197, 66); // Gold / warm timber highlight
  doc.text(tagline.toUpperCase(), 40, 17);

  doc.setFontSize(7.5);
  doc.setTextColor(235, 224, 212);
  doc.text(`${phone}  |  ${email}  |  ${address}`, 40, 23);

  // Document Title Badge on Right
  doc.setFillColor(140, 84, 43); // Warm saddle timber
  doc.roundedRect(144, 5, 52, 19, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('MEASUREMENT TALLY', 146, 12);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Ref: ${sheet.referenceNumber || 'N/A'}`, 146, 17);
  doc.text(`Date: ${sheet.measurementDate || ''}`, 146, 21);

  // --- Sheet & Customer Metadata Box ---
  let y = 37;
  doc.setFillColor(247, 250, 248);
  doc.setDrawColor(215, 225, 220);
  doc.roundedRect(14, y, 182, 28, 2, 2, 'FD');

  doc.setTextColor(40, 45, 42);
  doc.setFontSize(9);

  // Column 1
  doc.setFont('helvetica', 'bold');
  doc.text('Sheet Title:', 18, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(sheet.sheetName || 'Untitled Sheet', 44, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.text('Customer:', 18, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(sheet.customerName || 'Direct Cash Customer', 44, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('Project / Site:', 18, y + 21);
  doc.setFont('helvetica', 'normal');
  doc.text(sheet.projectName || 'General Supply', 44, y + 21);

  // Column 2
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 120, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(sheet.measurementDate || new Date().toISOString().split('T')[0], 148, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Entries:', 120, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(sheet.totalEntries.toString(), 148, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Pieces:', 120, y + 21);
  doc.setFont('helvetica', 'normal');
  doc.text(sheet.totalPieces.toString(), 148, y + 21);

  // --- Measurement Table Data ---
  const tableRows = sheet.items.map((it, idx) => {
    const l = typeof it.lengthFeet === 'number' ? it.lengthFeet : 0;
    const w = typeof it.widthInches === 'number' ? it.widthInches : 0;
    const t = typeof it.thicknessInches === 'number' ? it.thicknessInches : 0;
    const p = typeof it.pieces === 'number' ? it.pieces : 0;

    return [
      (idx + 1).toString(),
      it.woodType || 'Timber Sawn',
      l.toString(),
      w.toString(),
      t.toString(),
      p.toString(),
      formatValue(it.cft, 3),
      formatValue(it.sqft, 3)
    ];
  });

  autoTable(doc, {
    startY: y + 32,
    head: [[
      '#',
      'Species / Description',
      'Length (ft)',
      'Width (in)',
      'Thick (in)',
      'Pieces',
      'CFT',
      'SQFT'
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [61, 38, 20],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', cellWidth: 46 },
      2: { halign: 'right', cellWidth: 22 },
      3: { halign: 'right', cellWidth: 22 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 21, fontStyle: 'bold' },
      7: { halign: 'right', cellWidth: 21 }
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [38, 29, 21]
    },
    alternateRowStyles: {
      fillColor: [250, 246, 238]
    },
    margin: { left: 14, right: 14 }
  });

  // Position after table
  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // Check if we have room on current page for totals, notes, and signatures
  let currentY = finalY;
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // --- Grand Totals Summary Card ---
  doc.setFillColor(61, 38, 20);
  doc.roundedRect(100, currentY, 96, 32, 2, 2, 'F');

  doc.setTextColor(235, 224, 212);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL PIECES:', 106, currentY + 9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`${sheet.totalPieces} Pcs`, 155, currentY + 9);

  doc.setTextColor(235, 224, 212);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('GRAND TOTAL CFT:', 106, currentY + 18);
  doc.setTextColor(245, 197, 66); // Gold / warm timber highlight
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`${formatValue(sheet.totalCft, 3)} CFT`, 155, currentY + 18);

  doc.setTextColor(235, 224, 212);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('GRAND TOTAL SQFT:', 106, currentY + 26);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`${formatValue(sheet.totalSqft, 3)} SQFT`, 155, currentY + 26);

  // Optional Notes on the left
  if (sheet.notes) {
    doc.setFillColor(245, 247, 246);
    doc.roundedRect(14, currentY, 82, 32, 2, 2, 'F');
    doc.setTextColor(60, 70, 65);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes / Instructions:', 18, currentY + 7);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(sheet.notes, 74);
    doc.text(splitNotes, 18, currentY + 13);
  }

  // --- Sign-off Section ---
  const signY = currentY + 44;
  if (signY < 275) {
    doc.setDrawColor(180, 195, 185);
    doc.line(18, signY + 12, 75, signY + 12);
    doc.line(135, signY + 12, 192, signY + 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 110, 105);
    doc.text('Prepared & Tally Verified By', 25, signY + 17);
    doc.text('Customer Acceptance & Signature', 140, signY + 17);
  }

  // Page numbers and footer on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(130, 140, 135);
    doc.text(
      `Formula: CFT = (L × W × T × Pcs) / 144 | SQFT = CFT × 12  •  Page ${i} of ${totalPages}`,
      14,
      290
    );
    doc.text(`Generated: ${new Date().toLocaleString()}`, 155, 290);
  }

  const safeFilename = (sheet.sheetName || 'timber_sheet')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  const dateStr = sheet.measurementDate || new Date().toISOString().split('T')[0];

  doc.save(`${safeFilename}_${dateStr}.pdf`);
}
