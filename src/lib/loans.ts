import type { Loan, LoanStatus } from "./types";
import { isOverdue } from "./time";

export function effectiveLoanStatus(loan: Loan, now: Date): LoanStatus {
  if (loan.status === "returned" || loan.status === "denied") {
    return loan.status;
  }
  if (loan.status === "pending") return "pending";
  if (loan.status === "approved") return "approved";
  if (loan.status === "active" && isOverdue(loan.returnDate, now)) {
    return "overdue";
  }
  return loan.status;
}

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  pending: "Pending approval",
  approved: "Waiting pickup",
  active: "Active",
  returned: "Returned",
  denied: "Denied",
  overdue: "Overdue",
};

export const LOAN_BADGE_COLORS: Record<LoanStatus, string> = {
  pending: "bg-amber-100 border-amber-400 text-amber-900",
  approved: "bg-blue-100 border-blue-400 text-blue-900",
  active: "bg-emerald-100 border-emerald-500 text-emerald-900",
  returned: "bg-zinc-100 border-zinc-300 text-zinc-600",
  denied: "bg-zinc-200 border-zinc-400 text-zinc-700",
  overdue: "bg-red-100 border-red-500 text-red-900",
};

/** Member currently has club equipment out or approved for pickup. */
export function isMemberLoaningEquipment(
  userId: string,
  loans: Loan[],
  now: Date
): boolean {
  return loans.some((loan) => {
    if (loan.isExternal || loan.userId !== userId) return false;
    const status = effectiveLoanStatus(loan, now);
    return status === "approved" || status === "active" || status === "overdue";
  });
}
