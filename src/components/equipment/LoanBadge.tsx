"use client";

import type { Loan, LoanStatus } from "@/lib/types";
import { LOAN_BADGE_COLORS, LOAN_STATUS_LABELS, effectiveLoanStatus } from "@/lib/loans";
import { formatTimestamp } from "@/lib/time";

interface LoanBadgeProps {
  loan: Loan;
  now: Date;
  onClick: () => void;
}

export function LoanBadge({ loan, now, onClick }: LoanBadgeProps) {
  const status: LoanStatus = effectiveLoanStatus(loan, now);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border-2 px-4 py-3 text-left transition hover:shadow-md ${LOAN_BADGE_COLORS[status]}`}
    >
      {loan.isExternal && (
        <p className="mb-1 text-xs font-bold uppercase tracking-wide">EXTERNAL LOAN</p>
      )}
      <p className="font-semibold">{loan.userName}</p>
      <p className="text-sm opacity-80">
        {loan.equipment.map((e) => e.name).join(", ")}
      </p>
      <p className="mt-1 text-xs opacity-70">
        {LOAN_STATUS_LABELS[status]} · Requested {formatTimestamp(loan.createdAt)}
      </p>
    </button>
  );
}
