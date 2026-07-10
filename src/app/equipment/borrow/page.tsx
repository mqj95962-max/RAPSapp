"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { EquipmentList } from "@/components/equipment/EquipmentList";
import { useMemberCart } from "@/context/CartContext";
import { useServerTime } from "@/context/ServerTimeContext";
import { LiveSyncBanner } from "@/components/LiveSyncBanner";
import {
  useAllLoansLive,
  useCategoriesLive,
  useEquipmentLive,
} from "@/hooks/useLiveData";
import {
  filterEquipmentByCategoryTab,
  groupByCategory,
  isMemberBorrowListEquipment,
  type CategoryTabId,
} from "@/lib/equipment";

export default function BorrowPage() {
  const { addItem, items, hasItem } = useMemberCart();
  const { now } = useServerTime();
  const { equipment: allEquipment, loading: eqLoading, error: eqError } =
    useEquipmentLive();
  const { categories, loading: catLoading, error: catError } = useCategoriesLive();
  const { loans, error: loanError } = useAllLoansLive();
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success";
    message: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<CategoryTabId>("all");

  const equipment = useMemo(
    () => allEquipment.filter((e) => isMemberBorrowListEquipment(e)),
    [allEquipment]
  );
  const tabs = useMemo(() => {
    const filed = new Set(categories.flatMap((c) => c.equipmentIds));
    const list: { id: CategoryTabId; label: string; count: number }[] = [
      { id: "all", label: "All", count: equipment.length },
    ];

    for (const cat of categories) {
      list.push({
        id: cat.id,
        label: cat.name,
        count: equipment.filter((e) => cat.equipmentIds.includes(e.id)).length,
      });
    }

    const uncategorizedCount = equipment.filter((e) => !filed.has(e.id)).length;
    list.push({
      id: "uncategorized",
      label: "Uncategorized",
      count: uncategorizedCount,
    });
    return list;
  }, [categories, equipment]);

  const equipmentByTab = useMemo(
    () => filterEquipmentByCategoryTab(equipment, categories, activeTab),
    [equipment, categories, activeTab]
  );

  const grouped = useMemo(
    () => groupByCategory(equipmentByTab, categories),
    [equipmentByTab, categories]
  );
  const syncError = eqError || catError || loanError;

  const addToCart = (item: (typeof equipment)[number]) => {
    if (hasItem(item.id)) {
      setFeedback({
        tone: "error",
        message: `"${item.name}" is already in your cart.`,
      });
      return;
    }
    addItem(item);
    setFeedback({
      tone: "success",
      message: `Added "${item.name}" to your cart.`,
    });
  };

  return (
    <AppShell title="Borrow equipment">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Working and faulty equipment only. Reserved gear for club events is hidden.
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
      {feedback && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            feedback.tone === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
          role="alert"
        >
          {feedback.message}
        </p>
      )}

      <div className="mt-6 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex gap-1 overflow-x-auto pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-t-lg border border-b-0 px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "border-zinc-300 bg-white text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                  : "border-transparent bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {eqLoading || catLoading ? (
          <p className="text-sm text-zinc-500">Loading equipment…</p>
        ) : (
          <EquipmentList
            grouped={grouped}
            loans={loans}
            now={now}
            search={search}
            isInCart={hasItem}
            onAdd={addToCart}
            onUnavailable={(name) =>
              setFeedback({
                tone: "error",
                message: `"${name}" is already loaned out or unavailable.`,
              })
            }
          />
        )}
      </div>
    </AppShell>
  );
}
