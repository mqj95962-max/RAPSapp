"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminEventDetailModal } from "@/components/events/AdminEventDetailModal";
import { AdminEventSignupRow } from "@/components/events/AdminEventSignupRow";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { useServerTime } from "@/context/ServerTimeContext";
import { groupEventsByDate, groupFormalEventsByDate } from "@/lib/events";
import {
  countSignupsByFormalEvent,
  formatFormalEventSchedule,
  formatSignupCount,
  groupSignupsByFormalEvent,
  isFormalEventCompleted,
} from "@/lib/formalEvents";
import {
  completeFormalEvent,
  fetchAllEvents,
  fetchFormalEvents,
} from "@/lib/firestore";
import { formatTimestamp } from "@/lib/time";
import type { ClubEvent, FormalEvent } from "@/lib/types";

type CoverageTab = "signups" | "confirmed" | "formal" | "formal-completed";

export default function MemberEventsCoveragePage() {
  return (
    <AdminGuard>
      <CoverageContent />
    </AdminGuard>
  );
}

function CoverageContent() {
  const { profile } = useAuth();
  const { now } = useServerTime();
  const [tab, setTab] = useState<CoverageTab>("signups");
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [formalEvents, setFormalEvents] = useState<FormalEvent[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClubEvent | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

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

  const pendingEvents = useMemo(
    () => events.filter((e) => !e.confirmed),
    [events]
  );
  const confirmedEvents = useMemo(
    () => events.filter((e) => e.confirmed),
    [events]
  );

  const activeFormals = useMemo(
    () => formalEvents.filter((f) => !isFormalEventCompleted(f)),
    [formalEvents]
  );
  const completedFormals = useMemo(
    () => formalEvents.filter((f) => isFormalEventCompleted(f)),
    [formalEvents]
  );

  const q = search.trim().toLowerCase();

  const filterBySearch = (list: ClubEvent[]) =>
    list.filter(
      (e) =>
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.userName.toLowerCase().includes(q)
    );

  const filterFormalsBySearch = (list: FormalEvent[]) =>
    list.filter(
      (e) =>
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
    );

  const groupedSignups = groupEventsByDate(filterBySearch(pendingEvents));
  const groupedConfirmed = groupEventsByDate(filterBySearch(confirmedEvents));

  const formalSignupsPending = useMemo(
    () => pendingEvents.filter((e) => e.formalEventId != null),
    [pendingEvents]
  );
  const allFormalSignups = useMemo(
    () => events.filter((e) => e.formalEventId != null),
    [events]
  );

  const pendingSignupGroups = useMemo(
    () => groupSignupsByFormalEvent(formalSignupsPending),
    [formalSignupsPending]
  );
  const allSignupGroups = useMemo(
    () => groupSignupsByFormalEvent(allFormalSignups),
    [allFormalSignups]
  );
  const pendingSignupCounts = useMemo(
    () => countSignupsByFormalEvent(formalSignupsPending),
    [formalSignupsPending]
  );
  const allSignupCounts = useMemo(
    () => countSignupsByFormalEvent(allFormalSignups),
    [allFormalSignups]
  );

  const groupedActiveFormals = groupFormalEventsByDate(filterFormalsBySearch(activeFormals));
  const groupedCompletedFormals = groupFormalEventsByDate(
    filterFormalsBySearch(completedFormals)
  );

  const markComplete = async (formal: FormalEvent) => {
    if (!profile) return;
    const message =
      `Mark "${formal.title}" as completed?\n\nThis archives the formal event for exco tracking only. Member hours are not affected — confirm each member individually after photos are submitted.`;
    if (!window.confirm(message)) return;
    setCompletingId(formal.id);
    try {
      await completeFormalEvent(formal.id, profile.uid);
      await load();
      setTab("formal-completed");
    } finally {
      setCompletingId(null);
    }
  };

  const searchPlaceholder =
    tab === "formal" || tab === "formal-completed"
      ? "Search formal events…"
      : "Search member or event…";

  return (
    <AppShell title="Member events coverage">
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-700">
        <TabButton
          active={tab === "signups"}
          onClick={() => setTab("signups")}
          label="All member signups"
          count={pendingEvents.length}
        />
        <TabButton
          active={tab === "confirmed"}
          onClick={() => setTab("confirmed")}
          label="Confirmed events"
          count={confirmedEvents.length}
        />
        <TabButton
          active={tab === "formal"}
          onClick={() => setTab("formal")}
          label="Formal events"
          count={activeFormals.length}
        />
        <TabButton
          active={tab === "formal-completed"}
          onClick={() => setTab("formal-completed")}
          label="Completed formal events"
          count={completedFormals.length}
        />
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={searchPlaceholder}
        className="mt-4"
      />

      {tab === "signups" && (
        <div className="mt-4 space-y-6">
          <p className="text-sm text-zinc-500">
            Open signups awaiting photos or confirmation. Confirmed events are in
            the Confirmed events tab. Items turn red when photo submission is overdue
            (7 days after the event date).
          </p>
          {groupedSignups.map(({ date, label, events: dayEvents }) => (
            <section key={date}>
              <h3 className="text-sm font-semibold text-zinc-500">{label}</h3>
              <ul className="mt-2 space-y-2">
                {dayEvents.map((ev) => (
                  <AdminEventSignupRow key={ev.id} event={ev} now={now} onSelect={setSelected} />
                ))}
              </ul>
            </section>
          ))}
          {!groupedSignups.length && (
            <p className="text-sm text-zinc-500">No open signups found.</p>
          )}
        </div>
      )}

      {tab === "confirmed" && (
        <div className="mt-4 space-y-6">
          <p className="text-sm text-zinc-500">
            Confirmed coverage — archived here and counted toward member hours.
          </p>
          {groupedConfirmed.map(({ date, label, events: dayEvents }) => (
            <section key={date}>
              <h3 className="text-sm font-semibold text-zinc-500">{label}</h3>
              <ul className="mt-2 space-y-2">
                {dayEvents.map((ev) => (
                  <AdminEventSignupRow key={ev.id} event={ev} now={now} onSelect={setSelected} />
                ))}
              </ul>
            </section>
          ))}
          {!groupedConfirmed.length && (
            <p className="text-sm text-zinc-500">No confirmed events yet.</p>
          )}
        </div>
      )}

      {tab === "formal" && (
        <div className="mt-4 space-y-6">
          <p className="text-sm text-zinc-500">
            Active formal events. Use Complete when the event is over to archive it
            for exco — this does not confirm member hours. Confirm each member after
            photos are submitted, here or under Completed formal events.
          </p>
          {groupedActiveFormals.map(({ date, label, items }) => (
            <section key={date}>
              <h3 className="text-sm font-semibold text-zinc-500">{label}</h3>
              <div className="mt-2 space-y-4">
                {items.map((formal) => (
                  <FormalEventCoverageCard
                    key={formal.id}
                    formal={formal}
                    signups={pendingSignupGroups.get(formal.id) ?? []}
                    signupCount={pendingSignupCounts.get(formal.id) ?? 0}
                    now={now}
                    onSelect={setSelected}
                    onComplete={() => markComplete(formal)}
                    completing={completingId === formal.id}
                    showCompleteButton
                  />
                ))}
              </div>
            </section>
          ))}
          {!groupedActiveFormals.length && (
            <p className="text-sm text-zinc-500">No active formal events.</p>
          )}
        </div>
      )}

      {tab === "formal-completed" && (
        <div className="mt-4 space-y-6">
          <p className="text-sm text-zinc-500">
            Archived formal events for exco. Member hours are only counted when
            individual signups are confirmed — completing an event here does not
            grant hours.
          </p>
          {groupedCompletedFormals.map(({ date, label, items }) => (
            <section key={date}>
              <h3 className="text-sm font-semibold text-zinc-500">{label}</h3>
              <div className="mt-2 space-y-4">
                {items.map((formal) => (
                  <FormalEventCoverageCard
                    key={formal.id}
                    formal={formal}
                    signups={allSignupGroups.get(formal.id) ?? []}
                    signupCount={allSignupCounts.get(formal.id) ?? 0}
                    now={now}
                    onSelect={setSelected}
                    completed
                  />
                ))}
              </div>
            </section>
          ))}
          {!groupedCompletedFormals.length && (
            <p className="text-sm text-zinc-500">No completed formal events yet.</p>
          )}
        </div>
      )}

      {selected && profile && (
        <AdminEventDetailModal
          event={selected}
          onClose={() => setSelected(null)}
          onUpdated={load}
          adminId={profile.uid}
        />
      )}
    </AppShell>
  );
}

function FormalEventCoverageCard({
  formal,
  signups,
  signupCount,
  now,
  onSelect,
  onComplete,
  completing,
  showCompleteButton,
  completed,
}: {
  formal: FormalEvent;
  signups: ClubEvent[];
  signupCount: number;
  now: Date;
  onSelect: (event: ClubEvent) => void;
  onComplete?: () => void;
  completing?: boolean;
  showCompleteButton?: boolean;
  completed?: boolean;
}) {
  const unconfirmedCount = signups.filter((e) => !e.confirmed).length;

  return (
    <div
      className={`rounded-xl border p-4 ${
        completed
          ? "border-zinc-300 bg-zinc-50/80 dark:border-zinc-600 dark:bg-zinc-900/60"
          : "border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/20"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{formal.title}</p>
          <p className="text-sm text-zinc-500">
            {formatFormalEventSchedule(formal)} ·{" "}
            {formatSignupCount(signupCount, formal.maxSignups)}
          </p>
          {completed && formal.completedAt && (
            <p className="mt-1 text-xs text-zinc-500">
              Completed {formatTimestamp(formal.completedAt)}
            </p>
          )}
          {formal.description && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {formal.description}
            </p>
          )}
        </div>
        {showCompleteButton && onComplete && (
          <button
            type="button"
            disabled={completing}
            onClick={onComplete}
            className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {completing ? "Completing…" : "Complete"}
          </button>
        )}
      </div>
      {signups.length ? (
        <ul className="mt-3 space-y-2">
          {signups.map((ev) => (
            <AdminEventSignupRow key={ev.id} event={ev} now={now} onSelect={onSelect} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">
          {completed
            ? "No member signups recorded."
            : "No pending signups for this event."}
        </p>
      )}
      {completed && unconfirmedCount > 0 && (
        <p className="mt-3 text-xs text-amber-800 dark:text-amber-300">
          {unconfirmedCount} signup{unconfirmedCount === 1 ? "" : "s"} still need
          individual confirmation for hours.
        </p>
      )}
    </div>
  );
}

function TabButton({
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
