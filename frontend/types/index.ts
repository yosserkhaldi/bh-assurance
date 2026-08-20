export type Role = 'ADMIN' | 'MANAGER' | 'VIEWER';
export interface User { id: string; email: string; firstName?: string; lastName?: string; role: Role; status?: string }
export interface Meta { total: number; page: number; limit: number; pageCount: number }
export interface Paginated<T> { data: T[]; meta: Meta }
export interface Establishment {
  id: string; businessName: string; rne: string; address: string; governorate: string;
  managerName: string; phone: string; email: string; _count?: { contracts: number };
}
export interface EstablishmentForContract extends Establishment {
  hasActiveContract: boolean;
}
export interface Contract {
  id: string; number: string; type: string; startDate: string; endDate: string;
  status: string; establishmentId: string; establishment: Establishment; _count?: { vehicles: number };
}
export interface Vehicle {
  id: string; registrationNumber: string; make: string; model: string; year: number;
  chassisNumber: string; type: string; contractId: string; contract: Contract;
}

export type AmendmentType = 'VEHICLE_ADDITION' | 'VEHICLE_REMOVAL' | 'DATE_CHANGE' | 'COVERAGE_CHANGE' | 'OTHER';
export type AmendmentStatus = 'DRAFT' | 'ACTIVE' | 'CANCELLED';

export interface Amendment {
  id: string;
  contractId: string;
  type: AmendmentType;
  status: AmendmentStatus;
  effectiveDate: string | null;
  description: string | null;
  vehicleIds: string[] | null;
  createdAt: string;
  documents?: GeneratedDocument[];
}

export type GeneratedDocumentType = 'ATTESTATION' | 'GREEN_CARD' | 'AMENDMENT' | 'CONTRACT_SUMMARY';

export interface GeneratedDocument {
  id: string;
  type: GeneratedDocumentType;
  contractId: string;
  amendmentId: string | null;
  fileName: string;
  filePath: string;
  createdAt: string;
  generatedBy?: { id: string; firstName: string; lastName: string };
  amendment?: Amendment;
}
