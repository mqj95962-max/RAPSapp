"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { SearchBar } from "@/components/SearchBar";
import { LoanBadge } from "@/components/equipment/LoanBadge";
import { LoanDetailModal } from "@/components/equipment/LoanDetailModal";
import { useServerTime } from "@/context/ServerTimeContext";
import { LiveSyncBanner } from "@/components/LiveSyncBanner";
import { useAllLoansLive } from "@/hooks/useLiveData";
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
    <AdminGuard>
      <MemberLoansContent />
    </AdminGuard>
  );
}

function MemberLoansContent() {
  const { now } = useServerTime();
  const { loans: allLoans, loading, error } = useAllLoansLive();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Loan | null>(null);

  const loans = useMemo(
    () => allLoans.filter((l) => effectiveLoanStatus(l, now) !== "returned"),
    [allLoans, now]
  );

  const q = search.trim().toLowerCase();
  const filtered = loans.filter(
    (l) =>
      !q ||
      l.userName.toLowerCase().includes(q) ||
      l.equipment.some(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.equipmentId.toLowerCase().includes(q)
      )
  );

  return (
    <AppShell title="Member loans">
      <p className="text-sm text-zinc-500">
        Loan requests from all members update live — no refresh needed.
      </p>
      <LiveSyncBanner error={error} />
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search name or equipment…"
      />
      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading loans…</p>
      ) : (
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
          {!filtered.length && !loading && (
            <p className="text-sm text-zinc-500">No active loan requests.</p>
          )}
        </div>
      )}
      {selected && (
        <LoanDetailModal
          loan={selected}
          now={now}
          isAdmin
          onClose={() => setSelected(null)}
          onUpdated={() => setSelected(null)}
        />
      )}
    </AppShell>
  );
}
