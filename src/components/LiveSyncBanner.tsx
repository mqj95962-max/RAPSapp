"use client";

export function LiveSyncBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
      Could not sync with the database: {error}. Check your connection and Firestore
      rules.
    </p>
  );
}
