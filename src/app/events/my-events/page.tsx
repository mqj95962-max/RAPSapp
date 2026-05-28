"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { deleteEvent, fetchUserEvents, markPhotosSubmitted } from "@/lib/firestore";
import { sendNotification } from "@/lib/notifications";
import { groupEventsByDate } from "@/lib/events";
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
  const incomplete = filtered.filter((e) => !e.photosSubmitted);
  const pending = filtered.filter((e) => e.photosSubmitted && !e.confirmed);
  const completed = filtered.filter((e) => e.confirmed);

  const groupedIncomplete = groupEventsByDate(incomplete);
  const groupedPending = groupEventsByDate(pending);
  const groupedCompleted = groupEventsByDate(completed);

  return (
    <AppShell title="My events">
      <SearchBar value={search} onChange={setSearch} placeholder="Search events…" />
      <div className="mt-4 space-y-6">
        <EventGroupSection
          title={`Incomplete (${incomplete.length})`}
          tone="incomplete"
          grouped={groupedIncomplete}
          onSelect={setSelected}
          emptyText="No incomplete events."
        />
        <EventGroupSection
          title={`Pending (${pending.length})`}
          tone="pending"
          grouped={groupedPending}
          onSelect={setSelected}
          emptyText="No pending events."
        />
        <EventGroupSection
          title={`Completed (${completed.length})`}
          tone="completed"
          grouped={groupedCompleted}
          onSelect={setSelected}
          emptyText="No completed events."
        />
        {!filtered.length && (
          <p className="text-sm text-zinc-500">No events found.</p>
        )}
      </div>
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

function EventGroupSection({
  title,
  tone,
  grouped,
  onSelect,
  emptyText,
}: {
  title: string;
  tone: "incomplete" | "pending" | "completed";
  grouped: { date: string; label: string; events: ClubEvent[] }[];
  onSelect: (ev: ClubEvent) => void;
  emptyText: string;
}) {
  const headerClass =
    tone === "completed"
      ? "text-emerald-700"
      : tone === "pending"
        ? "text-blue-700"
        : "text-zinc-700 dark:text-zinc-200";

  return (
    <section>
      <h2 className={`text-sm font-semibold ${headerClass}`}>{title}</h2>
      {grouped.length ? (
        <div className="mt-3 space-y-6">
          {grouped.map(({ date, label, events: dayEvents }) => (
            <section key={date}>
              <h3 className="text-xs font-semibold text-zinc-500">{label}</h3>
              <ul className="mt-2 space-y-2">
                {dayEvents.map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(ev)}
                      className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                        ev.confirmed
                          ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                          : ev.photosSubmitted
                            ? "border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
                            : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                      }`}
                    >
                      <p className="font-medium">{ev.title}</p>
                      <p className="text-sm text-zinc-500">at {ev.eventTime}</p>
                      {ev.confirmed && (
                        <p className="mt-1 text-xs font-medium text-emerald-700">
                          Confirmed by admin
                        </p>
                      )}
                      {!ev.confirmed && ev.photosSubmitted && (
                        <p className="mt-1 text-xs font-medium text-blue-700">
                          Pending admin confirmation
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">{emptyText}</p>
      )}
    </section>
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
      const notifyError = await sendNotification("photos_submitted", {
        eventId: event.id,
      });
      if (notifyError) console.warn("[notifications]", notifyError);
      onUpdated();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const message = event.confirmed
      ? "This event is confirmed and counts toward your hours. Delete it anyway?"
      : "Delete this event? This cannot be undone.";
    if (!window.confirm(message)) return;
    setBusy(true);
    try {
      await deleteEvent(event.id);
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
        {event.formalEventId != null && (
          <p className="mt-1 text-xs text-violet-700">Formal event signup</p>
        )}
        {event.photosSubmitted && !event.confirmed && (
          <p className="mt-2 text-sm text-blue-700">
            Awaiting admin confirmation
          </p>
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
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          className="mt-3 w-full rounded-lg border border-red-200 py-2 text-sm font-medium text-red-700 disabled:opacity-40"
        >
          Delete event
        </button>
        <button type="button" onClick={onClose} className="mt-3 w-full text-sm text-zinc-500">
          Close
        </button>
      </div>
    </div>
  );
}
