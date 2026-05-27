import type { ClubEvent, FormalEvent } from "./types";

export function formatSignupCount(
  count: number,
  maxSignups: number | null
): string {
  if (maxSignups == null) return `${count} signed up`;
  return `${count}/${maxSignups} signed up`;
}

export function isFormalEventFull(
  count: number,
  maxSignups: number | null
): boolean {
  return maxSignups != null && count >= maxSignups;
}

export function countSignupsByFormalEvent(
  signups: ClubEvent[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const signup of signups) {
    if (!signup.formalEventId) continue;
    counts.set(
      signup.formalEventId,
      (counts.get(signup.formalEventId) ?? 0) + 1
    );
  }
  return counts;
}

export function groupSignupsByFormalEvent(
  signups: ClubEvent[]
): Map<string, ClubEvent[]> {
  const groups = new Map<string, ClubEvent[]>();
  for (const signup of signups) {
    if (!signup.formalEventId) continue;
    const list = groups.get(signup.formalEventId);
    if (list) list.push(signup);
    else groups.set(signup.formalEventId, [signup]);
  }
  return groups;
}

export function memberSignedUpForFormal(
  formalEventId: string,
  userEvents: ClubEvent[]
): boolean {
  return userEvents.some((e) => e.formalEventId === formalEventId);
}

export function formalEventSummary(formal: FormalEvent): string {
  return `${formal.eventTime} · ${formal.durationHours}h`;
}
