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
  /** When set, hidden from member borrow list (held for club events). */
  reservedAt: number | null;
  reservedNote: string;
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
  formalEventId: string | null;
  createdAt: number;
}

export interface FormalEvent {
  id: string;
  title: string;
  eventDate: string;
  eventTime: string;
  durationHours: number;
  description: string;
  /** null = unlimited signups */
  maxSignups: number | null;
  signupCount: number;
  createdAt: number;
  createdBy: string;
}
