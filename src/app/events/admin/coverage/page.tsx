"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { groupEventsByDate, groupFormalEventsByDate } from "@/lib/events";
import {
  countSignupsByFormalEvent,
  formatSignupCount,
  groupSignupsByFormalEvent,
} from "@/lib/formalEvents";
import {
  confirmEventPhotos,
  deleteEvent,
  fetchAllEvents,
  fetchFormalEvents,
} from "@/lib/firestore";
import { formatDate } from "@/lib/time";
import type { ClubEvent, FormalEvent } from "@/lib/types";

type CoverageTab = "signups" | "formal";

export default function MemberEventsCoveragePage() {
  return (
    <AdminGuard>
      <CoverageContent />
    </AdminGuard>
  );
}

function CoverageContent() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<CoverageTab>("signups");
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [formalEvents, setFormalEvents] = useState<FormalEvent[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClubEvent | null>(null);

  const load = useCallback(async () => {
    const [allEvents, formals] = await Promise.all([
      fetchAllEvents(),
      fetchFormalEvents(),
    ]);
    setEvents(allEvents);
    setFormalEvents(formals);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = search.trim().toLowerCase();

  const filteredSignups = events.filter(
    (e) =>
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.userName.toLowerCase().includes(q)
  );
  const groupedSignups = groupEventsByDate(filteredSignups);

  const formalSignups = useMemo(
    () => events.filter((e) => e.formalEventId),
    [events]
  );
  const signupGroups = useMemo(
    () => groupSignupsByFormalEvent(formalSignups),
    [formalSignups]
  );
  const signupCounts = useMemo(
    () => countSignupsByFormalEvent(formalSignups),
    [formalSignups]
  );

  const filteredFormals = formalEvents.filter(
    (e) =>
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q)
  );
  const groupedFormals = groupFormalEventsByDate(filteredFormals);

  return (
    <AppShell title="Member events coverage">
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
        <TabButton
          active={tab === "signups"}
          onClick={() => setTab("signups")}
          label="All member signups"
        />
        <TabButton
          active={tab === "formal"}
          onClick={() => setTab("formal")}
          label="Formal events"
        />
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={
          tab === "signups"
            ? "Search member or event…"
            : "Search formal events…"
        }
        className="mt-4"
      />

      {tab === "signups" ? (
        <div className="mt-4 space-y-6">
          {groupedSignups.map(({ date, label, events: dayEvents }) => (
            <section key={date}>
              <h3 className="text-sm font-semibold text-zinc-500">{label}</h3>
              <ul className="mt-2 space-y-2">
                {dayEvents.map((ev) => (
                  <SignupRow key={ev.id} event={ev} onSelect={setSelected} />
                ))}
              </ul>
            </section>
          ))}
          {!groupedSignups.length && (
            <p className="text-sm text-zinc-500">No events found.</p>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {groupedFormals.map(({ date, label, items }) => (
            <section key={date}>
              <h3 className="text-sm font-semibold text-zinc-500">{label}</h3>
              <div className="mt-2 space-y-4">
                {items.map((formal) => {
                  const signups = signupGroups.get(formal.id) ?? [];
                  const count = signupCounts.get(formal.id) ?? 0;
                  return (
                    <div
                      key={formal.id}
                      className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-800 dark:bg-violet-950/20"
                    >
                      <div>
                        <p className="font-medium">{formal.title}</p>
                        <p className="text-sm text-zinc-500">
                          {formal.eventTime} · {formal.durationHours}h ·{" "}
                          {formatSignupCount(count, formal.maxSignups)}
                        </p>
                        {formal.description && (
                          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                            {formal.description}
                          </p>
                        )}
                      </div>
                      {signups.length ? (
                        <ul className="mt-3 space-y-2">
                          {signups.map((ev) => (
                            <SignupRow
                              key={ev.id}
                              event={ev}
                              onSelect={setSelected}
                            />
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-zinc-500">
                          No member signups yet.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {!groupedFormals.length && (
            <p className="text-sm text-zinc-500">No formal events found.</p>
          )}
        </div>
      )}

      {selected && (
        <ArchivistEventModal
          event={selected}
          onClose={() => setSelected(null)}
          onUpdated={load}
          adminId={profile?.uid ?? ""}
        />
      )}
    </AppShell>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
          : "border-transparent text-zinc-500 hover:text-zinc-700"
      }`}
    >
      {label}
    </button>
  );
}

function SignupRow({
  event,
  onSelect,
}: {
  event: ClubEvent;
  onSelect: (event: ClubEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition ${
        event.confirmed
          ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
          : event.photosSubmitted
            ? "border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
            : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      }`}
    >
      <div>
        <p className="font-medium">{event.title}</p>
        <p className="text-sm text-zinc-500">
          {event.userName} · {event.eventTime}
          {event.formalEventId && (
            <span className="ml-2 text-xs text-violet-700">Formal signup</span>
          )}
        </p>
      </div>
      {event.photosSubmitted && !event.confirmed && (
        <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
          Pending confirmation
        </span>
      )}
      {event.confirmed && (
        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
          Confirmed
        </span>
      )}
    </button>
  );
}

function ArchivistEventModal({
  event,
  onClose,
  onUpdated,
  adminId,
}: {
  event: ClubEvent;
  onClose: () => void;
  onUpdated: () => void;
  adminId: string;
}) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await confirmEventPhotos(event.id, adminId);
      onUpdated();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const message = event.confirmed
      ? "This event is confirmed and counts toward member hours. Delete it anyway?"
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
        <p className="text-sm text-zinc-500">Member: {event.userName}</p>
        <p className="mt-2 text-sm">
          {formatDate(event.eventDate)} at {event.eventTime} · {event.durationHours}h
        </p>
        {event.formalEventId && (
          <p className="mt-1 text-xs text-violet-700">Signed up via formal event</p>
        )}
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
