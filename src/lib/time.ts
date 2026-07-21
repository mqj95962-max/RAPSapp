import { addDays, isAfter, isValid, parseISO, startOfDay } from "date-fns";

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
  const parsed = parseISO(returnDate);
  if (!isValid(parsed)) return false;
  return isAfter(startOfDay(now), startOfDay(parsed));
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

export function formatDate(date: string): string {
  const parsed = parseISO(date);
  if (!isValid(parsed)) return date || "No date";
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
