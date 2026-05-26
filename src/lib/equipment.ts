import type { Equipment, EquipmentAvailability, EquipmentStatus, Loan } from "./types";
import { effectiveLoanStatus } from "./loans";

export const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, string> = {
  working: "bg-emerald-500",
  faulty: "bg-amber-500",
  broken: "bg-red-500",
  missing: "bg-zinc-400",
};

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  working: "Working",
  faulty: "Faulty",
  broken: "Broken",
  missing: "Missing",
};

export function isBorrowable(status: EquipmentStatus): boolean {
  return status === "working" || status === "faulty";
}

export function getEquipmentAvailability(
  equipmentDocId: string,
  loans: Loan[],
  now: Date
): EquipmentAvailability {
  for (const loan of loans) {
    const status = effectiveLoanStatus(loan, now);
    if (
      status !== "active" &&
      status !== "approved" &&
      status !== "overdue"
    ) {
      continue;
    }
    const hasItem = loan.equipment.some(
      (e) => e.equipmentDocId === equipmentDocId
    );
    if (!hasItem) continue;
    if (loan.isExternal) return "external_loan";
    return "loaned";
  }
  return "available";
}

export function activeLoansForEquipment(
  equipmentDocId: string,
  loans: Loan[],
  now: Date
): Loan[] {
  return loans.filter((loan) => {
    const status = effectiveLoanStatus(loan, now);
    if (status !== "active" && status !== "approved" && status !== "overdue") {
      return false;
    }
    return loan.equipment.some((e) => e.equipmentDocId === equipmentDocId);
  });
}

export function filterEquipmentSearch<T extends { name: string; equipmentId: string }>(
  items: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.equipmentId.toLowerCase().includes(q)
  );
}

export function groupByCategory(
  equipment: Equipment[],
  categories: { id: string; name: string; equipmentIds: string[] }[]
): { categoryName: string; items: Equipment[] }[] {
  const uncategorized: Equipment[] = [];
  const grouped: { categoryName: string; items: Equipment[] }[] = [];

  for (const cat of categories) {
    const items = equipment.filter(
      (e) => cat.equipmentIds.includes(e.id) && !e.deletedAt
    );
    if (items.length) grouped.push({ categoryName: cat.name, items });
  }

  const filed = new Set(categories.flatMap((c) => c.equipmentIds));
  for (const e of equipment) {
    if (!e.deletedAt && !filed.has(e.id)) uncategorized.push(e);
  }
  if (uncategorized.length) {
    grouped.push({ categoryName: "Uncategorized", items: uncategorized });
  }

  return grouped;
}
