import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  type DocumentData,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type {
  Category,
  ClubEvent,
  Equipment,
  Loan,
  LoanEquipmentItem,
  LoanStatus,
  UserProfile,
  UserRole,
} from "./types";
import { defaultRoles } from "./roles";
import { computeReturnDate } from "./time";

function mapEquipment(id: string, data: DocumentData): Equipment {
  return {
    id,
    name: data.name ?? "",
    equipmentId: data.equipmentId ?? "",
    status: data.status ?? "working",
    statusDetails: data.statusDetails ?? "",
    categoryIds: data.categoryIds ?? [],
    deletedAt: data.deletedAt ?? null,
    createdAt: data.createdAt ?? 0,
    updatedAt: data.updatedAt ?? 0,
  };
}

function mapLoan(id: string, data: DocumentData): Loan {
  return {
    id,
    userId: data.userId ?? "",
    userName: data.userName ?? "",
    userPhone: data.userPhone ?? "",
    equipment: data.equipment ?? [],
    purpose: data.purpose ?? "",
    status: data.status ?? "pending",
    isExternal: data.isExternal ?? false,
    externalDetails: data.externalDetails ?? "",
    createdAt: data.createdAt ?? 0,
    pickupDate: data.pickupDate ?? null,
    returnDate: data.returnDate ?? null,
    activatedAt: data.activatedAt ?? null,
    approvedAt: data.approvedAt ?? null,
    deniedAt: data.deniedAt ?? null,
    returnedAt: data.returnedAt ?? null,
    approvalNote: data.approvalNote ?? "",
    approvedBy: data.approvedBy ?? null,
    extensionNote: data.extensionNote ?? "",
  };
}

function mapEvent(id: string, data: DocumentData): ClubEvent {
  return {
    id,
    userId: data.userId ?? "",
    userName: data.userName ?? "",
    title: data.title ?? "",
    eventDate: data.eventDate ?? "",
    eventTime: data.eventTime ?? "",
    photosSubmitted: data.photosSubmitted ?? false,
    photosSubmittedAt: data.photosSubmittedAt ?? null,
    confirmed: data.confirmed ?? false,
    confirmedAt: data.confirmedAt ?? null,
    confirmedBy: data.confirmedBy ?? null,
    durationHours: data.durationHours ?? 2,
    createdAt: data.createdAt ?? 0,
  };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(getDb(), "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    email: data.email ?? "",
    displayName: data.displayName ?? "",
    phone: data.phone ?? "",
    roles: data.roles ?? defaultRoles(),
    profileComplete: data.profileComplete ?? false,
    createdAt: data.createdAt ?? 0,
    updatedAt: data.updatedAt ?? 0,
  };
}

export async function upsertUserProfile(
  uid: string,
  email: string,
  patch: Partial<Pick<UserProfile, "displayName" | "phone" | "profileComplete">>
): Promise<void> {
  const ref = doc(getDb(), "users", uid);
  const existing = await getDoc(ref);
  const now = Date.now();
  if (!existing.exists()) {
    await setDoc(ref, {
      email,
      displayName: patch.displayName ?? "",
      phone: patch.phone ?? "",
      roles: defaultRoles(),
      profileComplete: patch.profileComplete ?? false,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await updateDoc(ref, { ...patch, updatedAt: now });
  }
}

export async function fetchEquipment(includeDeleted = false): Promise<Equipment[]> {
  const snap = await getDocs(collection(getDb(), "equipment"));
  return snap.docs
    .map((d) => mapEquipment(d.id, d.data()))
    .filter((e) => includeDeleted || !e.deletedAt)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchPastEquipment(): Promise<Equipment[]> {
  const snap = await getDocs(collection(getDb(), "equipment"));
  return snap.docs
    .map((d) => mapEquipment(d.id, d.data()))
    .filter((e) => e.deletedAt)
    .sort((a, b) => b.deletedAt! - a.deletedAt!);
}

export async function saveEquipment(
  item: Omit<Equipment, "createdAt" | "updatedAt"> & { id?: string }
): Promise<string> {
  const now = Date.now();
  if (item.id) {
    await updateDoc(doc(getDb(), "equipment", item.id), {
      name: item.name,
      equipmentId: item.equipmentId,
      status: item.status,
      statusDetails: item.statusDetails,
      categoryIds: item.categoryIds,
      deletedAt: item.deletedAt,
      updatedAt: now,
    });
    return item.id;
  }
  const ref = await addDoc(collection(getDb(), "equipment"), {
    name: item.name,
    equipmentId: item.equipmentId,
    status: item.status,
    statusDetails: item.statusDetails,
    categoryIds: item.categoryIds,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function softDeleteEquipment(id: string): Promise<void> {
  await updateDoc(doc(getDb(), "equipment", id), {
    deletedAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function fetchCategories(): Promise<Category[]> {
  const snap = await getDocs(collection(getDb(), "categories"));
  return snap.docs
    .map((d) => ({
      id: d.id,
      name: d.data().name ?? "",
      equipmentIds: d.data().equipmentIds ?? [],
      createdAt: d.data().createdAt ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveCategory(
  category: Partial<Category> & { name: string }
): Promise<string> {
  const now = Date.now();
  if (category.id) {
    await updateDoc(doc(getDb(), "categories", category.id), {
      name: category.name,
      equipmentIds: category.equipmentIds ?? [],
    });
    return category.id;
  }
  const ref = await addDoc(collection(getDb(), "categories"), {
    name: category.name,
    equipmentIds: category.equipmentIds ?? [],
    createdAt: now,
  });
  return ref.id;
}

export async function fetchAllLoans(): Promise<Loan[]> {
  const snap = await getDocs(
    query(collection(getDb(), "loans"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => mapLoan(d.id, d.data()));
}

export async function fetchUserLoans(userId: string): Promise<Loan[]> {
  const snap = await getDocs(
    query(
      collection(getDb(), "loans"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => mapLoan(d.id, d.data()));
}

export async function createLoanRequest(input: {
  userId: string;
  userName: string;
  userPhone: string;
  equipment: LoanEquipmentItem[];
  purpose: string;
  isExternal: boolean;
  externalDetails: string;
}): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(collection(getDb(), "loans"), {
    ...input,
    status: "pending" as LoanStatus,
    pickupDate: null,
    returnDate: null,
    activatedAt: null,
    approvedAt: null,
    deniedAt: null,
    returnedAt: null,
    approvalNote: "",
    approvedBy: null,
    extensionNote: "",
    createdAt: now,
  });
  return ref.id;
}

export async function approveLoan(
  loanId: string,
  pickupDate: string,
  note: string,
  approvedBy: string
): Promise<void> {
  const returnDate = computeReturnDate(pickupDate);
  await updateDoc(doc(getDb(), "loans", loanId), {
    status: "approved",
    pickupDate,
    returnDate,
    approvalNote: note,
    approvedBy,
    approvedAt: Date.now(),
  });
}

export async function denyLoan(
  loanId: string,
  note: string,
  approvedBy: string
): Promise<void> {
  await updateDoc(doc(getDb(), "loans", loanId), {
    status: "denied",
    approvalNote: note,
    approvedBy,
    deniedAt: Date.now(),
  });
}

export async function activateLoan(loanId: string, pickupDate: string): Promise<void> {
  const returnDate = computeReturnDate(pickupDate);
  await updateDoc(doc(getDb(), "loans", loanId), {
    status: "active",
    pickupDate,
    returnDate,
    activatedAt: Date.now(),
  });
}

export async function extendLoan(loanId: string, returnDate: string, note: string): Promise<void> {
  await updateDoc(doc(getDb(), "loans", loanId), {
    returnDate,
    extensionNote: note,
    status: "active",
  });
}

export async function markLoanReturned(loanId: string): Promise<void> {
  await updateDoc(doc(getDb(), "loans", loanId), {
    status: "returned",
    returnedAt: Date.now(),
  });
}

export async function fetchAllEvents(): Promise<ClubEvent[]> {
  const snap = await getDocs(
    query(collection(getDb(), "events"), orderBy("eventDate", "desc"))
  );
  return snap.docs.map((d) => mapEvent(d.id, d.data()));
}

export async function fetchUserEvents(userId: string): Promise<ClubEvent[]> {
  const snap = await getDocs(
    query(
      collection(getDb(), "events"),
      where("userId", "==", userId),
      orderBy("eventDate", "desc")
    )
  );
  return snap.docs.map((d) => mapEvent(d.id, d.data()));
}

export async function createEvent(input: {
  userId: string;
  userName: string;
  title: string;
  eventDate: string;
  eventTime: string;
  durationHours: number;
}): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(collection(getDb(), "events"), {
    ...input,
    photosSubmitted: false,
    photosSubmittedAt: null,
    confirmed: false,
    confirmedAt: null,
    confirmedBy: null,
    createdAt: now,
  });
  return ref.id;
}

export async function markPhotosSubmitted(eventId: string): Promise<void> {
  await updateDoc(doc(getDb(), "events", eventId), {
    photosSubmitted: true,
    photosSubmittedAt: Date.now(),
  });
}

export async function confirmEventPhotos(
  eventId: string,
  confirmedBy: string
): Promise<void> {
  await updateDoc(doc(getDb(), "events", eventId), {
    confirmed: true,
    confirmedAt: Date.now(),
    confirmedBy,
  });
}
