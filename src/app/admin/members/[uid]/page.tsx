"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { useServerTime } from "@/context/ServerTimeContext";
import {
  fetchUserEvents,
  fetchUserLoans,
  getUserProfile,
} from "@/lib/firestore";
import {
  formatPhotoSubmissionDueDate,
  groupEventsByDate,
  isPhotoSubmissionOverdue,
} from "@/lib/events";
import {
  effectiveLoanStatus,
  LOAN_BADGE_COLORS,
  LOAN_STATUS_LABELS,
} from "@/lib/loans";
import {
  formatMemberRoles,
  getMemberProfileSummary,
  type EventBucket,
} from "@/lib/memberActivity";
import { formatDate, formatTimestamp } from "@/lib/time";
import { isAdmin } from "@/lib/roles";
import type { ClubEvent, Loan, LoanStatus, UserProfile } from "@/lib/types";

const CURRENT_LOAN_STATUSES: LoanStatus[] = [
  "pending",
  "approved",
  "active",
  "overdue",
];
const HISTORY_LOAN_STATUSES: LoanStatus[] = ["returned", "denied"];

export default function MemberProfilePage() {
  const params = useParams();
  const uid = typeof params.uid === "string" ? params.uid : "";

  if (!uid) {
    return (
      <AppShell title="Member profile">
        <p className="text-sm text-red-600">Invalid member profile link.</p>
        <Link href="/admin/members" className="mt-4 inline-block text-sm text-blue-700">
          Back to View members
        </Link>
      </AppShell>
    );
  }

  return <MemberProfileContent uid={uid} />;
}

function MemberProfileContent({ uid }: { uid: string }) {
  const { now } = useServerTime();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [loanSearch, setLoanSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profile, userEvents, userLoans] = await Promise.all([
        getUserProfile(uid),
        fetchUserEvents(uid),
        fetchUserLoans(uid),
      ]);
      if (!profile) {
        setError("Member not found or you do not have permission to view this profile.");
        setUser(null);
        setEvents([]);
        setLoans([]);
        return;
      }
      setUser(profile);
      setEvents(userEvents);
      setLoans(userLoans);
    } catch {
      setError("Could not load member profile.");
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(
    () => getMemberProfileSummary(uid, events, loans, now),
    [uid, events, loans, now]
  );

  const eventQuery = eventSearch.trim().toLowerCase();
  const filteredEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          !eventQuery ||
          event.title.toLowerCase().includes(eventQuery) ||
          event.userName.toLowerCase().includes(eventQuery)
      ),
    [events, eventQuery]
  );

  const incompleteEvents = filteredEvents.filter(
    (event) => !event.photosSubmitted && !event.confirmed
  );
  const pendingEvents = filteredEvents.filter(
    (event) => event.photosSubmitted && !event.confirmed
  );
  const confirmedEvents = filteredEvents.filter((event) => event.confirmed);

  const groupedIncomplete = groupEventsByDate(incompleteEvents);
  const groupedPending = groupEventsByDate(pendingEvents);
  const groupedConfirmed = groupEventsByDate(confirmedEvents);

  const loanQuery = loanSearch.trim().toLowerCase();
  const filteredLoans = useMemo(
    () =>
      loans.filter((loan) => {
        if (!loanQuery) return true;
        return (
          loan.purpose.toLowerCase().includes(loanQuery) ||
          loan.equipment.some(
            (item) =>
              item.name.toLowerCase().includes(loanQuery) ||
              item.equipmentId.toLowerCase().includes(loanQuery)
          )
        );
      }),
    [loans, loanQuery]
  );

  const currentLoans = filteredLoans.filter((loan) =>
    CURRENT_LOAN_STATUSES.includes(effectiveLoanStatus(loan, now))
  );
  const historyLoans = filteredLoans.filter((loan) =>
    HISTORY_LOAN_STATUSES.includes(effectiveLoanStatus(loan, now))
  );

  const displayName = user?.displayName.trim() || "No name set";
  const email = user?.email.trim() || "No email";

  return (
    <AppShell title="Member profile">
      <Link
        href="/admin/members"
        className="inline-flex items-center text-sm font-medium text-blue-700 hover:underline"
      >
        ← Back to View members
      </Link>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading member profile…</p>
      ) : error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : user ? (
        <div className="mt-4 space-y-8">
          <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{displayName}</h2>
                <p className="mt-1 text-sm text-zinc-500">{email}</p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Roles: {formatMemberRoles(user)}
                </p>
                {!user.profileComplete && (
                  <p className="mt-1 text-xs text-amber-700">Profile incomplete</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <StatBadge label="Role" value={isAdmin(user) ? "Admin" : "Member"} />
                <StatBadge
                  label="Loaning"
                  value={summary.loans.loaningNow ? "Yes" : "No"}
                  highlight={summary.loans.loaningNow}
                />
                <StatBadge label="Total events" value={String(summary.events.totalEvents)} />
                <StatBadge
                  label="Confirmed hours"
                  value={`${summary.events.confirmedHours}h`}
                />
                <StatBadge
                  label="Current loans"
                  value={String(summary.loans.currentLoans)}
                />
                <StatBadge
                  label="Loan history"
                  value={String(summary.loans.historyLoans)}
                />
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <SummaryItem label="Incomplete events" value={summary.events.incompleteEvents} />
              <SummaryItem
                label="Pending confirmation"
                value={summary.events.pendingConfirmationEvents}
              />
              <SummaryItem label="Confirmed events" value={summary.events.confirmedEvents} />
              <SummaryItem label="Formal signups" value={summary.events.formalEvents} />
              <SummaryItem label="Pending loans" value={summary.loans.pending} />
              <SummaryItem label="Active / overdue loans" value={summary.loans.active + summary.loans.overdue} />
              <SummaryItem label="Returned loans" value={summary.loans.returned} />
              <SummaryItem label="Denied loans" value={summary.loans.denied} />
            </dl>
          </section>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Events</h3>
                <p className="text-sm text-zinc-500">
                  All event coverage for this member, including incomplete, pending, and confirmed entries.
                </p>
              </div>
              <SearchBar
                value={eventSearch}
                onChange={setEventSearch}
                placeholder="Search events…"
                className="w-full max-w-sm"
              />
            </div>
            <div className="mt-4 space-y-6">
              <EventSection
                title={`Incomplete (${incompleteEvents.length})`}
                tone="incomplete"
                grouped={groupedIncomplete}
                now={now}
                emptyText="No incomplete events."
              />
              <EventSection
                title={`Pending confirmation (${pendingEvents.length})`}
                tone="pending"
                grouped={groupedPending}
                now={now}
                emptyText="No events awaiting confirmation."
              />
              <EventSection
                title={`Confirmed (${confirmedEvents.length})`}
                tone="confirmed"
                grouped={groupedConfirmed}
                now={now}
                emptyText="No confirmed events yet."
              />
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Equipment loans</h3>
                <p className="text-sm text-zinc-500">
                  Current loan requests and historical loan activity for this member.
                </p>
              </div>
              <SearchBar
                value={loanSearch}
                onChange={setLoanSearch}
                placeholder="Search equipment or purpose…"
                className="w-full max-w-sm"
              />
            </div>
            <div className="mt-4 space-y-6">
              <LoanSection
                title={`Current loans (${currentLoans.length})`}
                loans={currentLoans}
                now={now}
                emptyText="No current loan requests."
              />
              <LoanSection
                title={`Loan history (${historyLoans.length})`}
                loans={historyLoans}
                now={now}
                emptyText="No returned or denied loans."
              />
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function StatBadge({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        highlight
          ? "bg-amber-100 text-amber-900"
          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
      }`}
    >
      {label}: {value}
    </span>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold">{value}</dd>
    </div>
  );
}

function EventSection({
  title,
  tone,
  grouped,
  now,
  emptyText,
}: {
  title: string;
  tone: EventBucket;
  grouped: ReturnType<typeof groupEventsByDate>;
  now: Date;
  emptyText: string;
}) {
  const toneClasses = {
    incomplete: "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
    pending: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30",
    confirmed:
      "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30",
  } as const;

  return (
    <div>
      <h4 className="text-sm font-semibold text-zinc-500">{title}</h4>
      {grouped.length ? (
        <div className="mt-2 space-y-4">
          {grouped.map(({ date, label, events: dayEvents }) => (
            <div key={date}>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                {label}
              </p>
              <ul className="mt-2 space-y-2">
                {dayEvents.map((event) => (
                  <li
                    key={event.id}
                    className={`rounded-lg border px-4 py-3 text-sm ${toneClasses[tone]}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-zinc-500">
                          {formatDate(event.eventDate)} at {event.eventTime} ·{" "}
                          {event.durationHours}h
                        </p>
                        {event.formalEventId != null && (
                          <p className="mt-1 text-xs text-violet-700">Formal signup</p>
                        )}
                        {tone === "incomplete" && (
                          <p
                            className={`mt-1 text-xs ${
                              isPhotoSubmissionOverdue(event, now)
                                ? "font-medium text-red-700"
                                : "text-zinc-500"
                            }`}
                          >
                            {isPhotoSubmissionOverdue(event, now)
                              ? "Photo submission overdue"
                              : `Submit photos by ${formatPhotoSubmissionDueDate(event.eventDate)}`}
                          </p>
                        )}
                        {tone === "pending" && (
                          <p className="mt-1 text-xs text-blue-700">
                            Photos submitted, awaiting admin confirmation
                          </p>
                        )}
                      </div>
                      {event.confirmed && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          Confirmed
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">{emptyText}</p>
      )}
    </div>
  );
}

function LoanSection({
  title,
  loans,
  now,
  emptyText,
}: {
  title: string;
  loans: Loan[];
  now: Date;
  emptyText: string;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-zinc-500">{title}</h4>
      {loans.length ? (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {loans.map((loan) => {
            const status = effectiveLoanStatus(loan, now);
            return (
              <li
                key={loan.id}
                className={`rounded-lg border-2 px-4 py-3 text-sm ${LOAN_BADGE_COLORS[status]}`}
              >
                {loan.isExternal && (
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide">
                    External loan
                  </p>
                )}
                <p className="font-medium">
                  {loan.equipment.map((item) => item.name).join(", ")}
                </p>
                <p className="mt-1 text-xs opacity-80">
                  {loan.equipment.map((item) => item.equipmentId).join(", ")}
                </p>
                <p className="mt-2 text-xs opacity-80">
                  {LOAN_STATUS_LABELS[status]}
                  {loan.purpose ? ` · ${loan.purpose}` : ""}
                </p>
                <p className="mt-1 text-xs opacity-70">
                  Requested {formatTimestamp(loan.createdAt)}
                  {loan.pickupDate ? ` · Pickup ${formatDate(loan.pickupDate)}` : ""}
                  {loan.returnDate ? ` · Return ${formatDate(loan.returnDate)}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">{emptyText}</p>
      )}
    </div>
  );
}
