import type { ClubEvent } from "./types";
import { formatDate } from "./time";

export function sortEventsByDateTime(events: ClubEvent[]): ClubEvent[] {
  return [...events].sort((a, b) => {
    const byDate = b.eventDate.localeCompare(a.eventDate);
    if (byDate !== 0) return byDate;
    return b.eventTime.localeCompare(a.eventTime);
  });
}

export interface EventDateGroup {
  date: string;
  label: string;
  events: ClubEvent[];
}

/** Group events under event-date headings, newest dates first. */
export function groupEventsByDate(events: ClubEvent[]): EventDateGroup[] {
  const sorted = sortEventsByDateTime(events);
  const byDate = new Map<string, ClubEvent[]>();

  for (const event of sorted) {
    const list = byDate.get(event.eventDate);
    if (list) list.push(event);
    else byDate.set(event.eventDate, [event]);
  }

  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));
  return dates.map((date) => ({
    date,
    label: formatDate(date),
    events: byDate.get(date)!,
  }));
}
