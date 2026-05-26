"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { SearchBar } from "@/components/SearchBar";
import { LoanBadge } from "@/components/equipment/LoanBadge";
import { LoanDetailModal } from "@/components/equipment/LoanDetailModal";
import { useServerTime } from "@/context/ServerTimeContext";
import { fetchAllLoans } from "@/lib/firestore";
import { effectiveLoanStatus } from "@/lib/loans";
import type { Loan, LoanStatus } from "@/lib/types";

const GROUPS: { status: LoanStatus; label: string }[] = [
  { status: "pending", label: "Pending approval" },
  { status: "approved", label: "Waiting pickup" },
  { status: "active", label: "Active" },
  { status: "overdue", label: "Overdue" },
];

export default function MemberLoansPage() {
  return (
    <AdminGuard role="quartermaster">
      <MemberLoansContent />
    </AdminGuard>
  );
}

function MemberLoansContent() {
  const { now } = useServerTime();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Loan | null>(null);

  const load = useCallback(async () => {
    const data = await fetchAllLoans();
    setLoans(data.filter((l) => effectiveLoanStatus(l, now) !== "returned"));
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
    <AppShell title="Member loans">
      <SearchBar value={search} onChange={setSearch} placeholder="Search name, phone, equipment…" />
      <div className="mt-6 space-y-8">
        {GROUPS.map(({ status, label }) => {
          const group = filtered.filter(
            (l) => effectiveLoanStatus(l, now) === status
          );
          if (!group.length) return null;
          return (
            <section key={status}>
              <h3 className="mb-2 text-sm font-semibold text-zinc-500">{label}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.map((loan) => (
                  <LoanBadge
                    key={loan.id}
                    loan={loan}
                    now={now}
                    onClick={() => setSelected(loan)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {selected && (
        <LoanDetailModal
          loan={selected}
          now={now}
          isAdmin
          onClose={() => setSelected(null)}
          onUpdated={load}
        />
      )}
    </AppShell>
  );
}
