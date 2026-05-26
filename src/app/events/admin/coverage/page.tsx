"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { confirmEventPhotos, fetchAllEvents } from "@/lib/firestore";
import { formatDate } from "@/lib/time";
import type { ClubEvent } from "@/lib/types";

export default function MemberEventsCoveragePage() {
  return (
    <AdminGuard role="archivist">
      <CoverageContent />
    </AdminGuard>
  );
}

function CoverageContent() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClubEvent | null>(null);

  const load = useCallback(async () => {
    setEvents(await fetchAllEvents());
  }, []);

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
    <AppShell title="Member events coverage">
      <SearchBar value={search} onChange={setSearch} placeholder="Search member or event…" />
      <ul className="mt-4 space-y-2">
        {filtered.map((ev) => (
          <li key={ev.id}>
            <button
              type="button"
              onClick={() => setSelected(ev)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div>
                <p className="font-medium">{ev.title}</p>
                <p className="text-sm text-zinc-500">
                  {ev.userName} · {formatDate(ev.eventDate)} {ev.eventTime}
                </p>
              </div>
              {ev.photosSubmitted && !ev.confirmed && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                  Ready to confirm
                </span>
              )}
              {ev.confirmed && (
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                  Confirmed
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <ArchivistEventModal
          event={selected}
          onClose={() => setSelected(null)}
          onUpdated={load}
          archivistId={profile?.uid ?? ""}
        />
      )}
    </AppShell>
  );
}

function ArchivistEventModal({
  event,
  onClose,
  onUpdated,
  archivistId,
}: {
  event: ClubEvent;
  onClose: () => void;
  onUpdated: () => void;
  archivistId: string;
}) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await confirmEventPhotos(event.id, archivistId);
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
        <p className="text-sm text-zinc-500">Member: {event.userName}</p>
        <p className="mt-2 text-sm">
          {formatDate(event.eventDate)} at {event.eventTime} · {event.durationHours}h
        </p>
        <p className="mt-2 text-sm">
          Photos submitted: {event.photosSubmitted ? "Yes" : "No"}
        </p>
        {event.photosSubmitted && !event.confirmed && (
          <button
            type="button"
            disabled={busy}
            onClick={confirm}
            className="mt-4 w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Confirm photos submitted
          </button>
        )}
        <button type="button" onClick={onClose} className="mt-3 w-full text-sm text-zinc-500">
          Close
        </button>
      </div>
    </div>
  );
}
