export type UserRole = "member" | "admin" | "quartermaster" | "archivist";

export type EquipmentStatus = "working" | "faulty" | "broken" | "missing";

export type EquipmentAvailability = "available" | "loaned" | "external_loan";

export type LoanStatus =
  | "pending"
  | "approved"
  | "active"
  | "returned"
  | "denied"
  | "overdue";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  roles: UserRole[];
  isAdmin: boolean;
  profileComplete: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Equipment {
  id: string;
  name: string;
  equipmentId: string;
  status: EquipmentStatus;
  statusDetails: string;
  categoryIds: string[];
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  equipmentIds: string[];
  createdAt: number;
}

export interface LoanEquipmentItem {
  equipmentDocId: string;
  equipmentId: string;
  name: string;
}

export interface Loan {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  equipment: LoanEquipmentItem[];
  purpose: string;
  status: LoanStatus;
  isExternal: boolean;
  externalDetails: string;
  createdAt: number;
  pickupDate: string | null;
  returnDate: string | null;
  activatedAt: number | null;
  approvedAt: number | null;
  deniedAt: number | null;
  returnedAt: number | null;
  approvalNote: string;
  approvedBy: string | null;
  extensionNote: string;
}

export interface ClubEvent {
  id: string;
  userId: string;
  userName: string;
  title: string;
  eventDate: string;
  eventTime: string;
  photosSubmitted: boolean;
  photosSubmittedAt: number | null;
  confirmed: boolean;
  confirmedAt: number | null;
  confirmedBy: string | null;
  durationHours: number;
  createdAt: number;
}
