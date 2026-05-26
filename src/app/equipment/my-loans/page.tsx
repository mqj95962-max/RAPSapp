"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { LoanBadge } from "@/components/equipment/LoanBadge";
import { LoanDetailModal } from "@/components/equipment/LoanDetailModal";
import { useAuth } from "@/context/AuthContext";
import { useServerTime } from "@/context/ServerTimeContext";
import { fetchUserLoans } from "@/lib/firestore";
import { effectiveLoanStatus } from "@/lib/loans";
import type { Loan, LoanStatus } from "@/lib/types";

const ACTIVE_STATUSES: LoanStatus[] = [
  "pending",
  "approved",
  "active",
  "overdue",
  "denied",
];

export default function MyLoansPage() {
  const { profile } = useAuth();
  const { now } = useServerTime();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Loan | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    const data = await fetchUserLoans(profile.uid);
    setLoans(
      data.filter((l) => {
        const s = effectiveLoanStatus(l, now);
        return ACTIVE_STATUSES.includes(s);
      })
    );
  }, [profile, now]);

  useEffect(() => {
    load();
  }, [load]);

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

  const byStatus = (status: LoanStatus) =>
    filtered.filter((l) => effectiveLoanStatus(l, now) === status);

  return (
    <AppShell title="My loans">
      <SearchBar value={search} onChange={setSearch} />
      <div className="mt-6 space-y-8">
        {(
          [
            ["pending", "Pending"],
            ["approved", "Waiting pickup"],
            ["active", "Active"],
            ["overdue", "Overdue"],
            ["denied", "Denied"],
          ] as const
        ).map(([status, label]) => {
          const group = byStatus(status);
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
        {!filtered.length && (
          <p className="text-sm text-zinc-500">No active loan requests.</p>
        )}
      </div>
      {selected && (
        <LoanDetailModal
          loan={selected}
          now={now}
          isAdmin={false}
          onClose={() => setSelected(null)}
          onUpdated={load}
        />
      )}
    </AppShell>
  );
}
