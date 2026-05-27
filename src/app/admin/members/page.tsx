"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LiveSyncBanner } from "@/components/LiveSyncBanner";
import { SearchBar } from "@/components/SearchBar";
import { useAllEventsLive, useAllLoansLive, useAllUsersLive } from "@/hooks/useLiveData";
import { isMemberLoaningEquipment } from "@/lib/loans";
import { useServerTime } from "@/context/ServerTimeContext";
import { isAdmin } from "@/lib/roles";

export default function ViewMembersPage() {
  return <ViewMembersContent />;
}

function ViewMembersContent() {
  const { now } = useServerTime();
  const { users, loading: usersLoading, error: usersError } = useAllUsersLive();
  const { loans, error: loansError } = useAllLoansLive();
  const { events, error: eventsError } = useAllEventsLive();
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

  const eventCountsByUserId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ev of events) {
      // Only count work that still needs action (not admin-confirmed yet).
      if (ev.confirmed) continue;
      counts.set(ev.userId, (counts.get(ev.userId) ?? 0) + 1);
    }
    return counts;
  }, [events]);

  const q = search.trim().toLowerCase();
  const filtered = users.filter((user) => {
    if (!q) return true;
    return (
      user.displayName.toLowerCase().includes(q) ||
      user.phone.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q)
    );
  });

  const syncError = usersError || loansError || eventsError;

  return (
    <AppShell title="View members">
      <p className="text-sm text-zinc-500">
        All members who have signed in. Loan and event stats update live.
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
            const loaning = loaningUserIds.has(user.uid);
            const displayName = user.displayName.trim() || "No name set";
            const phone = user.phone.trim() || "No phone set";
            const email = user.email.trim() || "No email";
            const eventCount = eventCountsByUserId.get(user.uid) ?? 0;
            const admin = isAdmin(user);

            return (
              <li
                key={user.uid}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div>
                  <p className="font-medium">{displayName}</p>
                  <p className="text-sm text-zinc-500">{email}</p>
                  <p className="text-sm text-zinc-500">{phone}</p>
                  {!user.profileComplete && (
                    <p className="mt-1 text-xs text-zinc-400">
                      Profile incomplete
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      loaning
                        ? "bg-amber-100 text-amber-900"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {loaning ? "Loaning" : "Not loaning"}
                  </span>
                  <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-900">
                    {eventCount} events
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      admin
                        ? "bg-amber-100 text-amber-900"
                        : "bg-emerald-100 text-emerald-900"
                    }`}
                  >
                    {admin ? "Admin" : "Member"}
                  </span>
                </div>
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
