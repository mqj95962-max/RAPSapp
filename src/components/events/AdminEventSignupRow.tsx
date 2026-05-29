"use client";

import {
  formatPhotoSubmissionDueDate,
  isPhotoSubmissionOverdue,
} from "@/lib/events";
import type { ClubEvent } from "@/lib/types";

export function AdminEventSignupRow({
  event,
  now,
  onSelect,
}: {
  event: ClubEvent;
  now: Date;
  onSelect: (event: ClubEvent) => void;
}) {
  const overdue = isPhotoSubmissionOverdue(event, now);

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition ${
        event.confirmed
          ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
          : event.photosSubmitted
            ? "border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
            : overdue
              ? "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/30"
              : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      }`}
    >
      <div>
        <p className="font-medium">{event.title}</p>
        <p className="text-sm text-zinc-500">
          {event.userName} · {event.eventTime}
          {event.formalEventId != null && (
            <span className="ml-2 text-xs text-violet-700">Formal signup</span>
          )}
        </p>
        {!event.photosSubmitted && !event.confirmed && (
          <p className={`mt-1 text-xs ${overdue ? "font-medium text-red-700" : "text-zinc-400"}`}>
            {overdue
              ? "Photo submission overdue"
              : `Submit photos by ${formatPhotoSubmissionDueDate(event.eventDate)}`}
          </p>
        )}
      </div>
      {overdue && (
        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
          Overdue
        </span>
      )}
      {event.photosSubmitted && !event.confirmed && (
        <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
          Pending confirmation
        </span>
      )}
      {event.confirmed && (
        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
          Confirmed
        </span>
      )}
    </button>
  );
}
