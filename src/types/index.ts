export interface MeasurementItem {
  id: string;
  serialNumber: number;
  lengthFeet: number | '';
  widthInches: number | '';
  thicknessInches: number | '';
  pieces: number | '';
  cft: number;
  sqft: number;
  woodType?: string;
  remarks?: string;
}

export interface SheetTotals {
  totalEntries: number;
  totalPieces: number;
  totalCft: number;
  totalSqft: number;
}

export interface MeasurementSheet {
  id: string;
  userId: string;
  sheetName: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  projectName: string;
  referenceNumber: string;
  measurementDate: string;
  notes: string;
  items: MeasurementItem[];
  totalEntries: number;
  totalPieces: number;
  totalCft: number;
  totalSqft: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'manager' | 'admin';
  companyName: string;
  createdAt?: string;
}

export interface BusinessSettings {
  companyName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  sqftFormulaType: 'standard_1face' | 'surface_area_2face';
  currencySymbol: string;
  ratePerCft?: number;
}
