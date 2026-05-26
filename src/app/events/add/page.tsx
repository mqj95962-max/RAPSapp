"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { createEvent } from "@/lib/firestore";

export default function AddEventPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [durationHours, setDurationHours] = useState(2);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit =
    title.trim() && eventDate && eventTime && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !profile) return;
    setSaving(true);
    setError("");
    try {
      await createEvent({
        userId: profile.uid,
        userName: profile.displayName,
        title: title.trim(),
        eventDate,
        eventTime,
        durationHours,
      });
      router.push("/events/my-events");
    } catch {
      setError("Could not create event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Add event">
      <form onSubmit={submit} className="max-w-md space-y-4">
        <label className="block text-sm">
          <span className="font-medium">Event</span>
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What event did you cover?"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Date</span>
          <input
            type="date"
            className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Time</span>
          <input
            type="time"
            className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Coverage hours</span>
          <input
            type="number"
            min={0.5}
            step={0.5}
            className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            value={durationHours}
            onChange={(e) => setDurationHours(Number(e.target.value))}
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-zinc-900 py-3 font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add event
        </button>
      </form>
    </AppShell>
  );
}
