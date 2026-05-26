"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { fetchUserEvents } from "@/lib/firestore";
import { formatDate } from "@/lib/time";
import type { ClubEvent } from "@/lib/types";

export default function MyHoursPage() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!profile) return;
    setEvents(await fetchUserEvents(profile.uid));
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmed = events.filter((e) => e.confirmed);
  const totalHours = confirmed.reduce((sum, e) => sum + e.durationHours, 0);

  const q = search.trim().toLowerCase();
  const filtered = confirmed.filter(
    (e) => !q || e.title.toLowerCase().includes(q)
  );

  return (
    <AppShell title="My hours">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center dark:border-emerald-800 dark:bg-emerald-950/40">
        <p className="text-sm text-emerald-800 dark:text-emerald-300">Total confirmed hours</p>
        <p className="mt-1 text-4xl font-bold text-emerald-900 dark:text-emerald-100">
          {totalHours}
        </p>
      </div>
      <div className="mt-6">
        <SearchBar value={search} onChange={setSearch} />
      </div>
      <ul className="mt-4 space-y-2">
        {filtered.map((ev) => (
          <li
            key={ev.id}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <p className="font-medium">{ev.title}</p>
            <p className="text-zinc-500">
              {formatDate(ev.eventDate)} · {ev.durationHours}h
            </p>
          </li>
        ))}
        {!filtered.length && (
          <li className="text-sm text-zinc-500">No confirmed events yet.</li>
        )}
      </ul>
    </AppShell>
  );
}
