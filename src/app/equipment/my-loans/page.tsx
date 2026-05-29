"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { LoanBadge } from "@/components/equipment/LoanBadge";
import { LoanDetailModal } from "@/components/equipment/LoanDetailModal";
import { useAuth } from "@/context/AuthContext";
import { useServerTime } from "@/context/ServerTimeContext";
import { LiveSyncBanner } from "@/components/LiveSyncBanner";
import { useUserLoansLive } from "@/hooks/useLiveData";
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
  const searchParams = useSearchParams();
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    const fromUrl = searchParams.get("notifyError");
    const fromStorage =
      typeof window !== "undefined"
        ? sessionStorage.getItem("raps_notify_error")
        : null;
    const message = fromUrl ?? fromStorage;
    if (message) {
      setNotifyError(message);
      sessionStorage.removeItem("raps_notify_error");
    }
  }, [searchParams]);
  const { now } = useServerTime();
  const { loans: userLoans, loading, error } = useUserLoansLive(profile?.uid);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Loan | null>(null);

  const loans = useMemo(
    () =>
      userLoans.filter((l) => {
        const s = effectiveLoanStatus(l, now);
        return ACTIVE_STATUSES.includes(s);
      }),
    [userLoans, now]
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

  const byStatus = (status: LoanStatus) =>
    filtered.filter((l) => effectiveLoanStatus(l, now) === status);

  return (
    <AppShell title="My loans">
      {notifyError && (
        <div className="mb-4 rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Loan saved — email to staff failed</p>
          <p className="mt-1">{notifyError}</p>
          <p className="mt-2 text-xs">
            Staff can still see the request in Member loans.
          </p>
        </div>
      )}
      <LiveSyncBanner error={error} />
      <SearchBar value={search} onChange={setSearch} />
      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading your loans…</p>
      ) : (
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
      )}
      {selected && (
        <LoanDetailModal
          loan={selected}
          now={now}
          isAdmin={false}
          onClose={() => setSelected(null)}
          onUpdated={() => setSelected(null)}
        />
      )}
    </AppShell>
  );
}
