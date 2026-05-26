"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { EquipmentList } from "@/components/equipment/EquipmentList";
import { useMemberCart } from "@/context/CartContext";
import { useServerTime } from "@/context/ServerTimeContext";
import {
  LiveSyncBanner,
  useAllLoansLive,
  useCategoriesLive,
  useEquipmentLive,
} from "@/hooks/useLiveData";
import { groupByCategory, isBorrowable } from "@/lib/equipment";
import { useState } from "react";

export default function BorrowPage() {
  const { addItem, items } = useMemberCart();
  const { now } = useServerTime();
  const { equipment: allEquipment, loading: eqLoading, error: eqError } =
    useEquipmentLive();
  const { categories, error: catError } = useCategoriesLive();
  const { loans, error: loanError } = useAllLoansLive();
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  const equipment = useMemo(
    () => allEquipment.filter((e) => isBorrowable(e.status)),
    [allEquipment]
  );
  const grouped = groupByCategory(equipment, categories);
  const syncError = eqError || catError || loanError;

  return (
    <AppShell title="Borrow equipment">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Working and faulty equipment only. Updates sync live for all members.
        </p>
        <Link
          href="/equipment/cart"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          View cart{items.length > 0 ? ` (${items.length})` : ""}
        </Link>
      </div>
      <LiveSyncBanner error={syncError} />
      <SearchBar value={search} onChange={setSearch} />
      {toast && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {toast}
        </p>
      )}
      <div className="mt-4">
        {eqLoading ? (
          <p className="text-sm text-zinc-500">Loading equipment…</p>
        ) : (
          <EquipmentList
            grouped={grouped}
            loans={loans}
            now={now}
            search={search}
            onAdd={addItem}
            onUnavailable={(name) =>
              setToast(`"${name}" is already loaned out or unavailable.`)
            }
          />
        )}
      </div>
    </AppShell>
  );
}
