"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function ProfileSetupModal() {
  const { saveProfile } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canContinue = name.trim().length > 0 && phone.trim().length > 0;

  const handleContinue = async (destination: "/home" | "/equipment/borrow" | "/events/add") => {
    if (!canContinue) return;
    setSaving(true);
    setError("");
    try {
      await saveProfile(name.trim(), phone.trim());
      router.push(destination);
    } catch {
      setError("Could not save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-setup-title"
      >
        <h2 id="profile-setup-title" className="text-lg font-semibold">
          Welcome — complete your profile
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Your name and phone are tied to your sign-in account for loan and event records.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="font-medium">Full name</span>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Phone number</span>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
            />
          </label>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <p className="mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Where would you like to go?
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <button
            type="button"
            disabled={!canContinue || saving}
            onClick={() => handleContinue("/home")}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Home dashboard
          </button>
          <button
            type="button"
            disabled={!canContinue || saving}
            onClick={() => handleContinue("/equipment/borrow")}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-600"
          >
            Borrow equipment
          </button>
          <button
            type="button"
            disabled={!canContinue || saving}
            onClick={() => handleContinue("/events/add")}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-600"
          >
            Add event coverage
          </button>
        </div>
      </div>
    </div>
  );
}
