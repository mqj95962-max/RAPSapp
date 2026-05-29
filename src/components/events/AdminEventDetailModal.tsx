"use client";

import { useState } from "react";
import { confirmEventPhotos, deleteEvent } from "@/lib/firestore";
import { formatDate } from "@/lib/time";
import type { ClubEvent } from "@/lib/types";

export function AdminEventDetailModal({
  event,
  onClose,
  onUpdated,
  adminId,
}: {
  event: ClubEvent;
  onClose: () => void;
  onUpdated: () => void;
  adminId: string;
}) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await confirmEventPhotos(event.id, adminId);
      onUpdated();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const message = event.formalEventId != null
      ? event.confirmed
        ? "Remove this member's formal event signup? The club formal event itself will stay listed. This signup counts toward their hours — remove anyway?"
        : "Remove this member's signup for the formal event? The formal event itself will not be deleted."
      : event.confirmed
        ? "This event is confirmed and counts toward member hours. Delete it anyway?"
        : "Delete this event? This cannot be undone.";
    if (!window.confirm(message)) return;
    setBusy(true);
    try {
      await deleteEvent(event.id);
      onUpdated();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">{event.title}</h2>
        <p className="text-sm text-zinc-500">Member: {event.userName}</p>
        <p className="mt-2 text-sm">
          {formatDate(event.eventDate)} at {event.eventTime} · {event.durationHours}h
        </p>
        {event.formalEventId != null && (
          <p className="mt-1 text-xs text-violet-700">Signed up via formal event</p>
        )}
        <p className="mt-2 text-sm">
          Photos submitted: {event.photosSubmitted ? "Yes" : "No"}
        </p>
        {event.photosSubmitted && !event.confirmed && (
          <button
            type="button"
            disabled={busy}
            onClick={confirm}
            className="mt-4 w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Confirm photos submitted
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          className="mt-3 w-full rounded-lg border border-red-200 py-2 text-sm font-medium text-red-700 disabled:opacity-40"
        >
          {event.formalEventId != null ? "Remove member signup" : "Delete event"}
        </button>
        <button type="button" onClick={onClose} className="mt-3 w-full text-sm text-zinc-500">
          Close
        </button>
      </div>
    </div>
  );
}
