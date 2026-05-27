"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FormalEventBadge } from "@/components/events/FormalEventBadge";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import {
  countSignupsByFormalEvent,
  formatSignupCount,
  isFormalEventFull,
  memberSignedUpForFormal,
} from "@/lib/formalEvents";
import { groupFormalEventsByDate } from "@/lib/events";
import {
  fetchAllEvents,
  fetchFormalEvents,
  FormalEventSignupError,
  signUpForFormalEvent,
} from "@/lib/firestore";
import { formatDate } from "@/lib/time";
import type { ClubEvent, FormalEvent } from "@/lib/types";

export default function FormalEventsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [formalEvents, setFormalEvents] = useState<FormalEvent[]>([]);
  const [userEvents, setUserEvents] = useState<ClubEvent[]>([]);
  const [allSignups, setAllSignups] = useState<ClubEvent[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<FormalEvent | null>(null);

  const load = useCallback(async () => {
    const [events, memberEvents] = await Promise.all([
      fetchFormalEvents(),
      fetchAllEvents(),
    ]);
    setFormalEvents(events);
    setAllSignups(memberEvents.filter((e) => e.formalEventId));
    if (profile) {
      setUserEvents(memberEvents.filter((e) => e.userId === profile.uid));
    }
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const signupCounts = useMemo(
    () => countSignupsByFormalEvent(allSignups),
    [allSignups]
  );

  const q = search.trim().toLowerCase();
  const filtered = formalEvents.filter(
    (e) =>
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q)
  );
  const grouped = groupFormalEventsByDate(filtered);

  return (
    <AppShell title="Formal events">
      <p className="text-sm text-zinc-500">
        Sign up for club events posted by admins. Signed-up events appear in My events.
      </p>
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
                const signedUp = memberSignedUpForFormal(event.id, userEvents);
                const full = isFormalEventFull(count, event.maxSignups);
                return (
                  <li key={event.id}>
                    <FormalEventBadge
                      title={event.title}
                      subtitle={`${event.eventTime} · ${event.durationHours}h`}
                      meta={formatSignupCount(count, event.maxSignups)}
                      status={
                        signedUp ? "Signed up" : full ? "Full" : undefined
                      }
                      statusTone={
                        signedUp ? "signed" : full ? "full" : "default"
                      }
                      onClick={() => setSelected(event)}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {!grouped.length && (
          <p className="text-sm text-zinc-500">No formal events available.</p>
        )}
      </div>

      {selected && profile && (
        <MemberFormalEventDetailModal
          event={selected}
          signupCount={signupCounts.get(selected.id) ?? 0}
          signedUp={memberSignedUpForFormal(selected.id, userEvents)}
          profile={profile}
          onClose={() => setSelected(null)}
          onSignedUp={() => {
            setSelected(null);
            load();
            router.push("/events/my-events");
          }}
        />
      )}
    </AppShell>
  );
}

function MemberFormalEventDetailModal({
  event,
  signupCount,
  signedUp,
  profile,
  onClose,
  onSignedUp,
}: {
  event: FormalEvent;
  signupCount: number;
  signedUp: boolean;
  profile: { uid: string; displayName: string };
  onClose: () => void;
  onSignedUp: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const full = isFormalEventFull(signupCount, event.maxSignups);

  const signUp = async () => {
    setBusy(true);
    setError("");
    try {
      await signUpForFormalEvent(event.id, profile.uid, profile.displayName);
      onSignedUp();
    } catch (err) {
      setError(
        err instanceof FormalEventSignupError
          ? err.message
          : "Could not sign up."
      );
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
        {signedUp ? (
          <p className="mt-4 text-sm text-emerald-700">
            You are signed up. View this event in My events to submit photos.
          </p>
        ) : full ? (
          <p className="mt-4 text-sm text-zinc-600">This event is full.</p>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={signUp}
            className="mt-4 w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Sign up
          </button>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button type="button" onClick={onClose} className="mt-3 w-full text-sm text-zinc-500">
          Close
        </button>
      </div>
    </div>
  );
}
