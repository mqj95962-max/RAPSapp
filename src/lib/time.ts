import { addDays, isAfter, parseISO, startOfDay } from "date-fns";

export const LOAN_PERIOD_DAYS = 7;

export async function fetchServerTime(): Promise<Date> {
  try {
    const res = await fetch("https://worldtimeapi.org/api/ip");
    if (res.ok) {
      const data = (await res.json()) as { datetime: string };
      return new Date(data.datetime);
    }
  } catch {
    /* fallback */
  }
  return new Date();
}

export function computeReturnDate(pickupDate: string): string {
  const base = startOfDay(parseISO(pickupDate));
  return addDays(base, LOAN_PERIOD_DAYS).toISOString().slice(0, 10);
}

export function isOverdue(returnDate: string | null, now: Date): boolean {
  if (!returnDate) return false;
  const due = startOfDay(parseISO(returnDate));
  return isAfter(startOfDay(now), due);
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

export function formatDate(date: string): string {
  return parseISO(date).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
