import type { ClubEvent, FormalEvent } from "./types";

export const FORMAL_SIGNUP_ERROR = "FormalEventSignupError";

export function createFormalSignupError(message: string): Error {
  const err = new Error(message);
  err.name = FORMAL_SIGNUP_ERROR;
  return err;
}

export function isFormalSignupError(err: unknown): err is Error {
  return err instanceof Error && err.name === FORMAL_SIGNUP_ERROR;
}

/** Parse HH:mm into minutes from midnight. Returns null if invalid. */
export function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

function formatMinutesAsTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Duration in hours from start/end. Supports overnight (end before start). */
export function durationHoursFromTimes(
  startTime: string,
  endTime: string
): number | null {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start == null || end == null) return null;
  let diff = end - start;
  if (diff <= 0) diff += 24 * 60;
  // Round to nearest 0.25h for cleaner storage/display
  return Math.round((diff / 60) * 4) / 4;
}

export function endTimeFromStartAndDuration(
  startTime: string,
  durationHours: number
): string {
  const start = parseTimeToMinutes(startTime);
  if (start == null || !Number.isFinite(durationHours) || durationHours <= 0) {
    return "";
  }
  return formatMinutesAsTime(start + Math.round(durationHours * 60));
}

export function resolveFormalEndTime(formal: {
  eventTime: string;
  endTime?: string | null;
  durationHours: number;
}): string {
  if (formal.endTime && parseTimeToMinutes(formal.endTime) != null) {
    return formal.endTime;
  }
  return endTimeFromStartAndDuration(formal.eventTime, formal.durationHours);
}

export function formatFormalEventSchedule(formal: FormalEvent): string {
  const end = resolveFormalEndTime(formal);
  if (end) {
    return `${formal.eventTime}–${end} · ${formal.durationHours}h`;
  }
  return `${formal.eventTime} · ${formal.durationHours}h`;
}

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
    if (signup.formalEventId == null) continue;
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
    if (signup.formalEventId == null) continue;
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
  return formatFormalEventSchedule(formal);
}

export function isFormalEventCompleted(formal: FormalEvent): boolean {
  return formal.completedAt != null;
}
