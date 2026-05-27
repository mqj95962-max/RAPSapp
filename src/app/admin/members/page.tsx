"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LiveSyncBanner } from "@/components/LiveSyncBanner";
import { SearchBar } from "@/components/SearchBar";
import { useAllLoansLive, useAllUsersLive } from "@/hooks/useLiveData";
import { isMemberLoaningEquipment } from "@/lib/loans";
import { useServerTime } from "@/context/ServerTimeContext";

export default function ViewMembersPage() {
  return <ViewMembersContent />;
}

function ViewMembersContent() {
  const { now } = useServerTime();
  const { users, loading: usersLoading, error: usersError } = useAllUsersLive();
  const { loans, error: loansError } = useAllLoansLive();
  const [search, setSearch] = useState("");

  const loaningUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const user of users) {
      if (isMemberLoaningEquipment(user.uid, loans, now)) {
        ids.add(user.uid);
      }
    }
    return ids;
  }, [users, loans, now]);

  const q = search.trim().toLowerCase();
  const filtered = users.filter((user) => {
    if (!q) return true;
    return (
      user.displayName.toLowerCase().includes(q) ||
      user.phone.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q)
    );
  });

  const syncError = usersError || loansError;

  return (
    <AppShell title="View members">
      <p className="text-sm text-zinc-500">
        All members who have signed in. Loan status updates live.
      </p>
      <LiveSyncBanner error={syncError} />
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search name, phone, or email…"
        className="mt-4"
      />

      {usersLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading members…</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {filtered.map((user) => {
            const isLoaning = loaningUserIds.has(user.uid);
            const displayName = user.displayName.trim() || "No name set";
            const phone = user.phone.trim() || "No phone set";

            return (
              <li
                key={user.uid}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div>
                  <p className="font-medium">{displayName}</p>
                  <p className="text-sm text-zinc-500">{phone}</p>
                  {!user.profileComplete && (
                    <p className="mt-1 text-xs text-zinc-400">
                      Profile incomplete
                    </p>
                  )}
                </div>
                {isLoaning && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
                    Loaning equipment
                  </span>
                )}
              </li>
            );
          })}
          {!filtered.length && (
            <li className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-600">
              No members found.
            </li>
          )}
        </ul>
      )}
    </AppShell>
  );
}
