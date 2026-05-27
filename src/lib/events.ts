import type { ClubEvent } from "./types";
import { formatDate } from "./time";

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

function groupByEventDate<T extends { eventDate: string }>(
  items: T[]
): DateGroup<T>[] {
  const sorted = sortByDateTime(
    items as (T & { eventTime: string })[]
  );
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
