"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminEventDetailModal } from "@/components/events/AdminEventDetailModal";
import { AdminEventSignupRow } from "@/components/events/AdminEventSignupRow";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { groupEventsByDate, groupFormalEventsByDate } from "@/lib/events";
import {
  countSignupsByFormalEvent,
  formatSignupCount,
  groupSignupsByFormalEvent,
} from "@/lib/formalEvents";
import { fetchAllEvents, fetchFormalEvents } from "@/lib/firestore";
import type { ClubEvent, FormalEvent } from "@/lib/types";

type CoverageTab = "signups" | "confirmed" | "formal";

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

  const pendingEvents = useMemo(
    () => events.filter((e) => !e.confirmed),
    [events]
  );
  const confirmedEvents = useMemo(
    () => events.filter((e) => e.confirmed),
    [events]
  );

  const q = search.trim().toLowerCase();

  const filterBySearch = (list: ClubEvent[]) =>
    list.filter(
      (e) =>
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.userName.toLowerCase().includes(q)
    );

  const groupedSignups = groupEventsByDate(filterBySearch(pendingEvents));
  const groupedConfirmed = groupEventsByDate(filterBySearch(confirmedEvents));

  const formalSignupsPending = useMemo(
    () => pendingEvents.filter((e) => e.formalEventId != null),
    [pendingEvents]
  );
  const signupGroups = useMemo(
    () => groupSignupsByFormalEvent(formalSignupsPending),
    [formalSignupsPending]
  );
  const signupCounts = useMemo(
    () => countSignupsByFormalEvent(formalSignupsPending),
    [formalSignupsPending]
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
        />
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={
          tab === "formal"
            ? "Search formal events…"
            : "Search member or event…"
        }
        className="mt-4"
      />

      {tab === "signups" && (
        <div className="mt-4 space-y-6">
          <p className="text-sm text-zinc-500">
            Open signups awaiting photos or confirmation. Confirmed events are in
            the Confirmed events tab.
          </p>
          {groupedSignups.map(({ date, label, events: dayEvents }) => (
            <section key={date}>
              <h3 className="text-sm font-semibold text-zinc-500">{label}</h3>
              <ul className="mt-2 space-y-2">
                {dayEvents.map((ev) => (
                  <AdminEventSignupRow key={ev.id} event={ev} onSelect={setSelected} />
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
                  <AdminEventSignupRow key={ev.id} event={ev} onSelect={setSelected} />
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
            Formal event signups still needing action. Confirmed formal signups are
            under Confirmed events.
          </p>
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
                            <AdminEventSignupRow
                              key={ev.id}
                              event={ev}
                              onSelect={setSelected}
                            />
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-zinc-500">
                          No pending signups for this event.
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
