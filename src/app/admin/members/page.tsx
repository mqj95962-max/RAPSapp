"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LiveSyncBanner } from "@/components/LiveSyncBanner";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { useAllEventsLive, useAllLoansLive, useAllUsersLive } from "@/hooks/useLiveData";
import { isMemberLoaningEquipment } from "@/lib/loans";
import { setMemberAdminRole } from "@/lib/firestore";
import { isAdmin } from "@/lib/roles";
import { useServerTime } from "@/context/ServerTimeContext";
import type { UserProfile } from "@/lib/types";

export default function ViewMembersPage() {
  return <ViewMembersContent />;
}

function ViewMembersContent() {
  const { profile } = useAuth();
  const { now } = useServerTime();
  const { users, loading: usersLoading, error: usersError } = useAllUsersLive();
  const { loans, error: loansError } = useAllLoansLive();
  const { events, error: eventsError } = useAllEventsLive();
  const [search, setSearch] = useState("");
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const staffCount = useMemo(() => users.filter((u) => isAdmin(u)).length, [users]);

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
      counts.set(ev.userId, (counts.get(ev.userId) ?? 0) + 1);
    }
    return counts;
  }, [events]);

  const eventHoursByUserId = useMemo(() => {
    const hours = new Map<string, number>();
    for (const ev of events) {
      if (!ev.confirmed) continue;
      hours.set(ev.userId, (hours.get(ev.userId) ?? 0) + (ev.durationHours ?? 0));
    }
    return hours;
  }, [events]);

  const q = search.trim().toLowerCase();
  const filtered = users.filter((user) => {
    if (!q) return true;
    return (
      user.displayName.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q)
    );
  });

  const syncError = usersError || loansError || eventsError;

  const toggleAdmin = async (user: UserProfile, makeAdmin: boolean) => {
    if (!profile) return;
    if (user.uid === profile.uid) {
      setActionError("You cannot change your own admin role here.");
      return;
    }
    if (!makeAdmin && isAdmin(user) && staffCount <= 1) {
      setActionError("Cannot remove the last admin. Promote someone else first.");
      return;
    }
    const label = user.displayName.trim() || user.email;
    if (
      !makeAdmin &&
      !window.confirm(`Remove admin access for ${label}? They will become a regular member.`)
    ) {
      return;
    }
    setBusyUid(user.uid);
    setActionError(null);
    try {
      await setMemberAdminRole(user.uid, makeAdmin);
    } catch {
      setActionError("Could not update role. Check Firestore rules are deployed.");
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <AppShell title="View members">
      <p className="text-sm text-zinc-500">
        All members who have signed in. Loan and event stats update live. Admins can
        promote or demote the admin role below.
      </p>
      <LiveSyncBanner error={syncError} />
      {actionError && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {actionError}
        </p>
      )}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search name or email…"
        className="mt-4"
      />

      {usersLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading members…</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {filtered.map((user) => {
            const loaning = loaningUserIds.has(user.uid);
            const displayName = user.displayName.trim() || "No name set";
            const email = user.email.trim() || "No email";
            const eventCount = eventCountsByUserId.get(user.uid) ?? 0;
            const eventHours = eventHoursByUserId.get(user.uid) ?? 0;
            const staff = isAdmin(user);
            const isSelf = user.uid === profile?.uid;
            const busy = busyUid === user.uid;

            return (
              <li
                key={user.uid}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div>
                  <p className="font-medium">
                    {displayName}
                    {isSelf && (
                      <span className="ml-2 text-xs font-normal text-zinc-500">(you)</span>
                    )}
                  </p>
                  <p className="text-sm text-zinc-500">{email}</p>
                  {!user.profileComplete && (
                    <p className="mt-1 text-xs text-zinc-400">Profile incomplete</p>
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
                  <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-900">
                    {eventHours}h confirmed
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      staff
                        ? "bg-amber-100 text-amber-900"
                        : "bg-emerald-100 text-emerald-900"
                    }`}
                  >
                    {staff ? "Admin" : "Member"}
                  </span>
                  {!isSelf && (
                    staff ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleAdmin(user, false)}
                        className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium disabled:opacity-40 dark:border-zinc-600"
                      >
                        {busy ? "…" : "Remove admin"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleAdmin(user, true)}
                        className="rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
                      >
                        {busy ? "…" : "Make admin"}
                      </button>
                    )
                  )}
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
