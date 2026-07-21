import { isPhotoSubmissionOverdue } from "./events";
import {
  effectiveLoanStatus,
  isMemberLoaningEquipment,
  LOAN_STATUS_LABELS,
} from "./loans";
import type { ClubEvent, Loan, LoanStatus, UserProfile } from "./types";

export interface MemberEventStats {
  totalEvents: number;
  incompleteEvents: number;
  pendingConfirmationEvents: number;
  confirmedEvents: number;
  confirmedHours: number;
  formalEvents: number;
  selfAddedEvents: number;
}

export interface MemberLoanStats {
  pending: number;
  approved: number;
  active: number;
  overdue: number;
  returned: number;
  denied: number;
  currentLoans: number;
  historyLoans: number;
  loaningNow: boolean;
}

export interface MemberProfileSummary {
  events: MemberEventStats;
  loans: MemberLoanStats;
}

export interface MemberActivityLedgerRow {
  sortKey: number;
  activityDate: string;
  memberName: string;
  userId: string;
  activityType: "Event" | "Loan";
  status: string;
  details: string;
  hours: number | "";
  recordId: string;
}

export type EventBucket = "incomplete" | "pending" | "confirmed";

export function getEventBucket(event: ClubEvent, now: Date): EventBucket {
  if (event.confirmed) return "confirmed";
  if (event.photosSubmitted) return "pending";
  return isPhotoSubmissionOverdue(event, now) ? "incomplete" : "incomplete";
}

export function getEventStatusLabel(event: ClubEvent, now: Date): string {
  if (event.confirmed) return "Confirmed";
  if (event.photosSubmitted) return "Pending confirmation";
  if (isPhotoSubmissionOverdue(event, now)) return "Overdue (photos)";
  return "Incomplete";
}

export function filterMemberEvents(userId: string, events: ClubEvent[]): ClubEvent[] {
  return events.filter((event) => event.userId === userId);
}

export function filterMemberLoans(userId: string, loans: Loan[]): Loan[] {
  return loans.filter((loan) => loan.userId === userId);
}

export function getMemberEventStats(
  userId: string,
  events: ClubEvent[]
): MemberEventStats {
  const memberEvents = filterMemberEvents(userId, events);
  let incompleteEvents = 0;
  let pendingConfirmationEvents = 0;
  let confirmedEvents = 0;
  let confirmedHours = 0;
  let formalEvents = 0;

  for (const event of memberEvents) {
    if (event.formalEventId != null) formalEvents++;
    if (event.confirmed) {
      confirmedEvents++;
      confirmedHours += event.durationHours ?? 0;
    } else if (event.photosSubmitted) {
      pendingConfirmationEvents++;
    } else {
      incompleteEvents++;
    }
  }

  return {
    totalEvents: memberEvents.length,
    incompleteEvents,
    pendingConfirmationEvents,
    confirmedEvents,
    confirmedHours,
    formalEvents,
    selfAddedEvents: memberEvents.length - formalEvents,
  };
}

export function getMemberLoanStats(
  userId: string,
  loans: Loan[],
  now: Date
): MemberLoanStats {
  const memberLoans = filterMemberLoans(userId, loans);
  const counts: Record<LoanStatus, number> = {
    pending: 0,
    approved: 0,
    active: 0,
    overdue: 0,
    returned: 0,
    denied: 0,
  };

  for (const loan of memberLoans) {
    const status = effectiveLoanStatus(loan, now);
    counts[status]++;
  }

  const currentLoans =
    counts.pending + counts.approved + counts.active + counts.overdue;
  const historyLoans = counts.returned + counts.denied;

  return {
    ...counts,
    currentLoans,
    historyLoans,
    loaningNow: isMemberLoaningEquipment(userId, loans, now),
  };
}

export function getMemberProfileSummary(
  userId: string,
  events: ClubEvent[],
  loans: Loan[],
  now: Date
): MemberProfileSummary {
  return {
    events: getMemberEventStats(userId, events),
    loans: getMemberLoanStats(userId, loans, now),
  };
}

export function formatMemberRoles(user: UserProfile): string {
  return user.roles.join(", ");
}

function equipmentSummary(loan: Loan): string {
  return loan.equipment.map((item) => `${item.name} (${item.equipmentId})`).join("; ");
}

export function buildMemberActivityLedger(
  users: UserProfile[],
  events: ClubEvent[],
  loans: Loan[],
  now: Date
): MemberActivityLedgerRow[] {
  const nameByUserId = new Map(
    users.map((user) => [user.uid, user.displayName.trim() || user.email || user.uid])
  );
  const rows: MemberActivityLedgerRow[] = [];

  for (const event of events) {
    rows.push({
      sortKey: Date.parse(`${event.eventDate}T${event.eventTime || "00:00"}`) || event.createdAt,
      activityDate: event.eventDate,
      memberName: event.userName || nameByUserId.get(event.userId) || event.userId,
      userId: event.userId,
      activityType: "Event",
      status: getEventStatusLabel(event, now),
      details: `${event.title}${event.formalEventId != null ? " (Formal signup)" : ""}`,
      hours: event.confirmed ? event.durationHours ?? 0 : "",
      recordId: event.id,
    });
  }

  for (const loan of loans) {
    const status = effectiveLoanStatus(loan, now);
    const activityDate =
      loan.returnDate ??
      loan.pickupDate ??
      new Date(loan.createdAt).toISOString().slice(0, 10);

    rows.push({
      sortKey: loan.returnedAt ?? loan.activatedAt ?? loan.approvedAt ?? loan.createdAt,
      activityDate,
      memberName: loan.userName || nameByUserId.get(loan.userId) || loan.userId,
      userId: loan.userId,
      activityType: "Loan",
      status: LOAN_STATUS_LABELS[status],
      details: `${equipmentSummary(loan)}${loan.isExternal ? " (External)" : ""}`,
      hours: "",
      recordId: loan.id,
    });
  }

  return rows.sort((a, b) => b.sortKey - a.sortKey);
}
