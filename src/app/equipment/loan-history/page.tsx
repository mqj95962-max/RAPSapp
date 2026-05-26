"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { useServerTime } from "@/context/ServerTimeContext";
import { LiveSyncBanner, useUserLoansLive } from "@/hooks/useLiveData";
import { effectiveLoanStatus, LOAN_STATUS_LABELS } from "@/lib/loans";
import { formatTimestamp } from "@/lib/time";

export default function LoanHistoryPage() {
  const { profile } = useAuth();
  const { now } = useServerTime();
  const { loans: userLoans, error } = useUserLoansLive(profile?.uid);
  const [search, setSearch] = useState("");

  const loans = useMemo(
    () => userLoans.filter((l) => effectiveLoanStatus(l, now) === "returned"),
    [userLoans, now]
  );

  const q = search.trim().toLowerCase();
  const filtered = loans.filter(
    (l) =>
      !q ||
      l.purpose.toLowerCase().includes(q) ||
      l.equipment.some(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.equipmentId.toLowerCase().includes(q)
      )
  );

  return (
    <AppShell title="Loan history">
      <LiveSyncBanner error={error} />
      <SearchBar value={search} onChange={setSearch} />
      <ul className="mt-4 space-y-3">
        {filtered.map((loan) => (
          <li
            key={loan.id}
            className="rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <p className="font-medium">
              {loan.equipment.map((e) => e.name).join(", ")}
            </p>
            <p className="text-zinc-500">{loan.purpose}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {LOAN_STATUS_LABELS.returned} · Requested{" "}
              {formatTimestamp(loan.createdAt)}
              {loan.returnedAt && ` · Returned ${formatTimestamp(loan.returnedAt)}`}
            </p>
          </li>
        ))}
        {!filtered.length && (
          <li className="text-sm text-zinc-500">No archived loans yet.</li>
        )}
      </ul>
    </AppShell>
  );
}
