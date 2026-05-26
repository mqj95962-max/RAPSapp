"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useServerTime } from "@/context/ServerTimeContext";
import { createLoanRequest } from "@/lib/firestore";
import { LOAN_PERIOD_DAYS } from "@/lib/time";
import { addDays, format } from "date-fns";

export default function CartPage() {
  const { profile } = useAuth();
  const { items, removeItem, clear } = useCart();
  const { now } = useServerTime();
  const router = useRouter();
  const [purpose, setPurpose] = useState("");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const expectedReturn = format(addDays(now, LOAN_PERIOD_DAYS), "PPP");
  const q = search.trim().toLowerCase();
  const filtered = items.filter(
    (i) =>
      !q ||
      i.name.toLowerCase().includes(q) ||
      i.equipmentId.toLowerCase().includes(q)
  );

  const canSubmit =
    purpose.trim().length > 0 && filtered.length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit || !profile) return;
    setSubmitting(true);
    setError("");
    try {
      await createLoanRequest({
        userId: profile.uid,
        userName: profile.displayName,
        userPhone: profile.phone,
        equipment: filtered.map((e) => ({
          equipmentDocId: e.id,
          equipmentId: e.equipmentId,
          name: e.name,
        })),
        purpose: purpose.trim(),
        isExternal: false,
        externalDetails: "",
      });
      clear();
      router.push("/equipment/my-loans");
    } catch {
      setError("Could not submit loan request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Cart">
      <SearchBar value={search} onChange={setSearch} />
      <p className="mt-3 text-sm text-zinc-500">
        Standard loan period is {LOAN_PERIOD_DAYS} days after pickup is confirmed.
        Expected return if picked up today: {expectedReturn}
      </p>
      <ul className="mt-4 space-y-2">
        {filtered.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-zinc-500">ID: {item.equipmentId}</p>
            </div>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="text-sm text-red-600 hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
        {!filtered.length && (
          <li className="text-sm text-zinc-500">Your cart is empty.</li>
        )}
      </ul>
      <label className="mt-6 block text-sm">
        <span className="font-medium">Purpose of loan</span>
        <textarea
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
          rows={3}
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Describe what you need the equipment for"
        />
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={!canSubmit}
        onClick={submit}
        className="mt-4 w-full rounded-xl bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Confirm loan request
      </button>
    </AppShell>
  );
}
