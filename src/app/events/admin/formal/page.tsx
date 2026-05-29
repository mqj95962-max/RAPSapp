"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminEventDetailModal } from "@/components/events/AdminEventDetailModal";
import { AdminEventSignupRow } from "@/components/events/AdminEventSignupRow";
import { FormalEventBadge } from "@/components/events/FormalEventBadge";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { groupEventsByDate, groupFormalEventsByDate } from "@/lib/events";
import {
  countSignupsByFormalEvent,
  formatSignupCount,
  isFormalEventFull,
} from "@/lib/formalEvents";
import {
  createFormalEvent,
  deleteFormalEvent,
  fetchAllEvents,
  fetchFormalEventSignups,
  fetchFormalEvents,
} from "@/lib/firestore";
import { formatDate } from "@/lib/time";
import type { ClubEvent, FormalEvent } from "@/lib/types";

type FormalAdminTab = "events" | "confirmed";

export default function AdminFormalEventsPage() {
  return (
    <AdminGuard>
      <AdminFormalEventsContent />
    </AdminGuard>
  );
}

function AdminFormalEventsContent() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<FormalAdminTab>("events");
  const [formalEvents, setFormalEvents] = useState<FormalEvent[]>([]);
  const [allSignups, setAllSignups] = useState<ClubEvent[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedFormal, setSelectedFormal] = useState<FormalEvent | null>(null);
  const [selectedSignup, setSelectedSignup] = useState<ClubEvent | null>(null);

  const load = useCallback(async () => {
    const [events, memberEvents] = await Promise.all([
      fetchFormalEvents(),
      fetchAllEvents(),
    ]);
    setFormalEvents(events);
    setAllSignups(memberEvents.filter((e) => e.formalEventId != null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingSignups = useMemo(
    () => allSignups.filter((e) => !e.confirmed),
    [allSignups]
  );
  const confirmedSignups = useMemo(
    () => allSignups.filter((e) => e.confirmed),
    [allSignups]
  );

  const signupCounts = useMemo(
    () => countSignupsByFormalEvent(allSignups),
    [allSignups]
  );
  const pendingCounts = useMemo(
    () => countSignupsByFormalEvent(pendingSignups),
    [pendingSignups]
  );

  const q = search.trim().toLowerCase();
  const filtered = formalEvents.filter(
    (e) =>
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q)
  );
  const grouped = groupFormalEventsByDate(filtered);

  const filterSignupsBySearch = (list: ClubEvent[]) =>
    list.filter(
      (e) =>
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.userName.toLowerCase().includes(q)
    );
  const groupedConfirmed = groupEventsByDate(
    filterSignupsBySearch(confirmedSignups)
  );

  return (
    <AppShell title="Formal events (admin)">
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-700">
        <FormalTabButton
          active={tab === "events"}
          onClick={() => setTab("events")}
          label="Formal events"
        />
        <FormalTabButton
          active={tab === "confirmed"}
          onClick={() => setTab("confirmed")}
          label="Confirmed signups"
          count={confirmedSignups.length}
        />
      </div>

      {tab === "events" && (
        <>
          <p className="mt-4 text-sm text-zinc-500">
            Create club events that members can sign up for. Confirmed signups are
            archived under Confirmed signups.
          </p>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="mt-4 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add formal event
          </button>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search formal events…"
            className="mt-4"
          />
          <div className="mt-4 space-y-6">
            {grouped.map(({ date, label, items }) => (
              <section key={date}>
                <h3 className="text-sm font-semibold text-zinc-500">{label}</h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {items.map((event) => {
                    const count = signupCounts.get(event.id) ?? 0;
                    const pending = pendingCounts.get(event.id) ?? 0;
                    const full = isFormalEventFull(count, event.maxSignups);
                    return (
                      <li key={event.id}>
                        <FormalEventBadge
                          title={event.title}
                          subtitle={`${event.eventTime} · ${event.durationHours}h`}
                          meta={formatSignupCount(count, event.maxSignups)}
                          status={
                            pending > 0
                              ? `${pending} pending`
                              : full
                                ? "Full"
                                : undefined
                          }
                          statusTone={full && pending === 0 ? "full" : "default"}
                          onClick={() => setSelectedFormal(event)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {!grouped.length && (
              <p className="text-sm text-zinc-500">No formal events yet.</p>
            )}
          </div>
        </>
      )}

      {tab === "confirmed" && (
        <>
          <p className="mt-4 text-sm text-zinc-500">
            Formal event signups that have been confirmed and count toward hours.
          </p>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search member or event…"
            className="mt-4"
          />
          <div className="mt-4 space-y-6">
            {groupedConfirmed.map(({ date, label, events: dayEvents }) => (
              <section key={date}>
                <h3 className="text-sm font-semibold text-zinc-500">{label}</h3>
                <ul className="mt-2 space-y-2">
                  {dayEvents.map((ev) => (
                    <AdminEventSignupRow
                      key={ev.id}
                      event={ev}
                      onSelect={setSelectedSignup}
                    />
                  ))}
                </ul>
              </section>
            ))}
            {!groupedConfirmed.length && (
              <p className="text-sm text-zinc-500">No confirmed formal signups yet.</p>
            )}
          </div>
        </>
      )}

      {showAdd && profile && (
        <AddFormalEventModal
          adminId={profile.uid}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
      {selectedFormal && (
        <AdminFormalEventDetailModal
          event={selectedFormal}
          signupCount={signupCounts.get(selectedFormal.id) ?? 0}
          onClose={() => setSelectedFormal(null)}
          onUpdated={load}
        />
      )}
      {selectedSignup && profile && (
        <AdminEventDetailModal
          event={selectedSignup}
          onClose={() => setSelectedSignup(null)}
          onUpdated={load}
          adminId={profile.uid}
        />
      )}
    </AppShell>
  );
}

function FormalTabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
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
      {count != null && (
        <span className="ml-1.5 text-xs opacity-70">({count})</span>
      )}
    </button>
  );
}

function AddFormalEventModal({
  adminId,
  onClose,
  onCreated,
}: {
  adminId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [durationHours, setDurationHours] = useState(2);
  const [description, setDescription] = useState("");
  const [noMaxSignups, setNoMaxSignups] = useState(false);
  const [maxSignups, setMaxSignups] = useState(10);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = Boolean(title.trim() && eventDate && eventTime && !saving);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      await createFormalEvent({
        title: title.trim(),
        eventDate,
        eventTime,
        durationHours,
        description: description.trim(),
        maxSignups: noMaxSignups ? null : maxSignups,
        createdBy: adminId,
      });
      onCreated();
    } catch {
      setError("Could not create formal event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Add formal event</h2>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="font-medium">Event title</span>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Date</span>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Time</span>
            <input
              type="time"
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Duration (hours)</span>
            <input
              type="number"
              min={0.5}
              step={0.5}
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Description</span>
            <textarea
              className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={noMaxSignups}
              onChange={(e) => setNoMaxSignups(e.target.checked)}
            />
            No max signups
          </label>
          {!noMaxSignups && (
            <label className="block text-sm">
              <span className="font-medium">Max signups</span>
              <input
                type="number"
                min={1}
                step={1}
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                value={maxSignups}
                onChange={(e) => setMaxSignups(Number(e.target.value))}
              />
            </label>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Create event
          </button>
          <button type="button" onClick={onClose} className="w-full text-sm text-zinc-500">
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminFormalEventDetailModal({
  event,
  signupCount,
  onClose,
  onUpdated,
}: {
  event: FormalEvent;
  signupCount: number;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [signups, setSignups] = useState<ClubEvent[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchFormalEventSignups(event.id).then((list) =>
      setSignups(list.filter((e) => !e.confirmed))
    );
  }, [event.id]);

  const remove = async () => {
    const message =
      signupCount > 0
        ? "Members have signed up for this event. Delete it anyway? Their My events entries will remain."
        : "Delete this formal event?";
    if (!window.confirm(message)) return;
    setBusy(true);
    try {
      await deleteFormalEvent(event.id);
      onUpdated();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">{event.title}</h2>
        <p className="mt-2 text-sm text-zinc-500">
          {formatDate(event.eventDate)} at {event.eventTime} · {event.durationHours}h
        </p>
        <p className="mt-3 text-sm">{event.description || "No description."}</p>
        <p className="mt-3 text-sm font-medium">
          {formatSignupCount(signupCount, event.maxSignups)}
          {event.maxSignups == null && " (unlimited)"}
        </p>
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Open signups</h3>
          <p className="text-xs text-zinc-500">
            Confirmed members appear under Confirmed signups.
          </p>
          {signups.length ? (
            <ul className="mt-2 space-y-1">
              {signups.map((signup) => (
                <li
                  key={signup.id}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
                >
                  {signup.userName}
                  {signup.photosSubmitted && (
                    <span className="ml-2 text-xs text-blue-600">Photos submitted</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">No open signups.</p>
          )}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          className="mt-4 w-full rounded-lg border border-red-200 py-2 text-sm font-medium text-red-700 disabled:opacity-40"
        >
          Delete formal event
        </button>
        <button type="button" onClick={onClose} className="mt-3 w-full text-sm text-zinc-500">
          Close
        </button>
      </div>
    </div>
  );
}
