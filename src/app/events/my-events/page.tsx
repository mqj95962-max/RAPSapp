"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { fetchUserEvents, markPhotosSubmitted } from "@/lib/firestore";
import { formatDate } from "@/lib/time";
import type { ClubEvent } from "@/lib/types";

export default function MyEventsPage() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClubEvent | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setEvents(await fetchUserEvents(profile.uid));
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const q = search.trim().toLowerCase();
  const filtered = events.filter(
    (e) =>
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.userName.toLowerCase().includes(q)
  );

  return (
    <AppShell title="My events">
      <SearchBar value={search} onChange={setSearch} placeholder="Search events…" />
      <ul className="mt-4 space-y-2">
        {filtered.map((ev) => (
          <li key={ev.id}>
            <button
              type="button"
              onClick={() => setSelected(ev)}
              className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                ev.confirmed
                  ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                  : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
              }`}
            >
              <p className="font-medium">{ev.title}</p>
              <p className="text-sm text-zinc-500">
                {formatDate(ev.eventDate)} at {ev.eventTime}
              </p>
              {ev.confirmed && (
                <p className="mt-1 text-xs font-medium text-emerald-700">
                  Confirmed by archivist
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <EventDetailModal
          event={selected}
          onClose={() => setSelected(null)}
          onUpdated={load}
        />
      )}
    </AppShell>
  );
}

function EventDetailModal({
  event,
  onClose,
  onUpdated,
}: {
  event: ClubEvent;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const submitPhotos = async () => {
    setBusy(true);
    try {
      await markPhotosSubmitted(event.id);
      onUpdated();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">{event.title}</h2>
        <p className="mt-2 text-sm text-zinc-500">
          {formatDate(event.eventDate)} at {event.eventTime}
        </p>
        <p className="mt-1 text-sm">{event.durationHours} hours coverage</p>
        {event.photosSubmitted && !event.confirmed && (
          <p className="mt-2 text-sm text-amber-700">Awaiting archivist confirmation</p>
        )}
        {event.confirmed && (
          <p className="mt-2 text-sm text-emerald-700">Photos confirmed</p>
        )}
        {!event.photosSubmitted && (
          <button
            type="button"
            disabled={busy}
            onClick={submitPhotos}
            className="mt-4 w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Photos submitted
          </button>
        )}
        <button type="button" onClick={onClose} className="mt-3 w-full text-sm text-zinc-500">
          Close
        </button>
      </div>
    </div>
  );
}
