import { addDays, isBefore, parseISO, startOfDay } from "date-fns";
import type { ClubEvent } from "./types";
import { formatDate } from "./time";

export const PHOTO_SUBMISSION_DAYS = 7;

/** Last calendar day members may submit photos (event date + 7 days). */
export function photoSubmissionDueDate(eventDate: string): string {
  return addDays(startOfDay(parseISO(eventDate)), PHOTO_SUBMISSION_DAYS)
    .toISOString()
    .slice(0, 10);
}

export function formatPhotoSubmissionDueDate(eventDate: string): string {
  return formatDate(photoSubmissionDueDate(eventDate));
}

/** True when photos are not in and today is on or after the due date. */
export function isPhotoSubmissionOverdue(event: ClubEvent, now: Date): boolean {
  if (event.photosSubmitted || event.confirmed) return false;
  const due = startOfDay(parseISO(photoSubmissionDueDate(event.eventDate)));
  const today = startOfDay(now);
  return !isBefore(today, due);
}

export interface DateGroup<T> {
  date: string;
  label: string;
  items: T[];
}

function sortByDateTime<T extends { eventDate: string; eventTime: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const byDate = b.eventDate.localeCompare(a.eventDate);
    if (byDate !== 0) return byDate;
    return b.eventTime.localeCompare(a.eventTime);
  });
}

function groupByEventDate<T extends { eventDate: string; eventTime: string }>(
  items: T[]
): DateGroup<T>[] {
  const sorted = sortByDateTime(items);
  const byDate = new Map<string, T[]>();

  for (const item of sorted) {
    const list = byDate.get(item.eventDate);
    if (list) list.push(item);
    else byDate.set(item.eventDate, [item]);
  }

  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));
  return dates.map((date) => ({
    date,
    label: formatDate(date),
    items: byDate.get(date)!,
  }));
}

export function sortEventsByDateTime(events: ClubEvent[]): ClubEvent[] {
  return sortByDateTime(events);
}

export interface EventDateGroup {
  date: string;
  label: string;
  events: ClubEvent[];
}

/** Group events under event-date headings, newest dates first. */
export function groupEventsByDate(events: ClubEvent[]): EventDateGroup[] {
  return groupByEventDate(events).map(({ date, label, items }) => ({
    date,
    label,
    events: items,
  }));
}

export function groupFormalEventsByDate<T extends { eventDate: string; eventTime: string }>(
  events: T[]
): DateGroup<T>[] {
  return groupByEventDate(events);
}
