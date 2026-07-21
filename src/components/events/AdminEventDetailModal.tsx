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
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      await confirmEventPhotos(event.id, adminId);
      onUpdated();
      onClose();
    } catch (err) {
      console.error("[admin-events] confirm photos failed", err);
      setError("Could not confirm this signup. Please try again.");
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await deleteEvent(event.id);
      onUpdated();
      onClose();
    } catch (err) {
      console.error("[admin-events] remove signup failed", err);
      setError("Could not remove this signup. Please try again.");
      setBusy(false);
      setConfirmingRemove(false);
    }
  };

  const removeMessage =
    event.formalEventId != null
      ? event.confirmed
        ? "This removes only this member's formal event signup and their confirmed hours. The formal event remains listed."
        : "This removes only this member's signup. The formal event remains listed and the member can sign up again."
      : event.confirmed
        ? "This event is confirmed and counts toward member hours. Delete it anyway?"
        : "Delete this event? This cannot be undone.";

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
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {confirmingRemove ? (
          <div className="mt-3 rounded-lg border border-red-200 p-3">
            <p className="text-sm text-red-700">{removeMessage}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={remove}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {busy
                  ? "Removing…"
                  : event.formalEventId != null
                    ? "Remove signup"
                    : "Delete event"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmingRemove(false)}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmingRemove(true)}
            className="mt-3 w-full rounded-lg border border-red-200 py-2 text-sm font-medium text-red-700 disabled:opacity-40"
          >
            {event.formalEventId != null ? "Remove member signup" : "Delete event"}
          </button>
        )}
        <button type="button" onClick={onClose} className="mt-3 w-full text-sm text-zinc-500">
          Close
        </button>
      </div>
    </div>
  );
}
