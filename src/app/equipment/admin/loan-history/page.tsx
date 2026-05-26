"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { SearchBar } from "@/components/SearchBar";
import { useServerTime } from "@/context/ServerTimeContext";
import { fetchAllLoans } from "@/lib/firestore";
import { effectiveLoanStatus, LOAN_STATUS_LABELS } from "@/lib/loans";
import { formatTimestamp } from "@/lib/time";
import type { Loan } from "@/lib/types";

export default function AdminLoanHistoryPage() {
  return (
    <AdminGuard role="quartermaster">
      <AdminLoanHistoryContent />
    </AdminGuard>
  );
}

function AdminLoanHistoryContent() {
  const { now } = useServerTime();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const data = await fetchAllLoans();
    setLoans(data.filter((l) => effectiveLoanStatus(l, now) === "returned"));
  }, [now]);

  useEffect(() => {
    load();
  }, [load]);

  const q = search.trim().toLowerCase();
  const filtered = loans.filter(
    (l) =>
      !q ||
      l.userName.toLowerCase().includes(q) ||
      l.userPhone.includes(q) ||
      l.equipment.some(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.equipmentId.toLowerCase().includes(q)
      )
  );

  return (
    <AppShell title="Loan history (all members)">
      <SearchBar value={search} onChange={setSearch} placeholder="Search member, phone, equipment…" />
      <ul className="mt-4 space-y-3">
        {filtered.map((loan) => (
          <li
            key={loan.id}
            className="rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {loan.isExternal && (
              <p className="text-xs font-bold text-blue-700">EXTERNAL LOAN</p>
            )}
            <p className="font-medium">
              {loan.userName} · {loan.userPhone}
            </p>
            <p>{loan.equipment.map((e) => e.name).join(", ")}</p>
            <p className="text-zinc-500">{loan.purpose}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {LOAN_STATUS_LABELS.returned} · {formatTimestamp(loan.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
