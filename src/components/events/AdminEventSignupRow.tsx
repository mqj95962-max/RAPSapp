"use client";

import type { ClubEvent } from "@/lib/types";

export function AdminEventSignupRow({
  event,
  onSelect,
}: {
  event: ClubEvent;
  onSelect: (event: ClubEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition ${
        event.confirmed
          ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
          : event.photosSubmitted
            ? "border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
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
      </div>
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
