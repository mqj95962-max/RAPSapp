"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { SearchBar } from "@/components/SearchBar";
import { EquipmentList } from "@/components/equipment/EquipmentList";
import { LiveSyncBanner } from "@/components/LiveSyncBanner";
import {
  useAllLoansLive,
  useCategoriesLive,
  useEquipmentLive,
} from "@/hooks/useLiveData";
import {
  canBeAddedToReserveList,
  filterEquipmentByCategoryTab,
  groupByCategory,
  isReserved,
  type CategoryTabId,
} from "@/lib/equipment";
import {
  releaseEquipment,
  releaseEquipmentBatch,
  reserveEquipmentBatch,
} from "@/lib/firestore";
import { formatTimestamp } from "@/lib/time";
import type { Equipment } from "@/lib/types";

type Tab = "add" | "list";

export default function ReserveEquipmentPage() {
  return (
    <AdminGuard>
      <ReserveEquipmentContent />
    </AdminGuard>
  );
}

function ReserveEquipmentContent() {
  const { equipment: allEquipment, loading: eqLoading, error: eqError } =
    useEquipmentLive();
  const { categories, loading: catLoading, error: catError } =
    useCategoriesLive();
  const { loans, error: loanError } = useAllLoansLive();
  const [tab, setTab] = useState<Tab>("add");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<CategoryTabId>("all");
  const [staging, setStaging] = useState<Equipment[]>([]);
  const [reserveNote, setReserveNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success";
    message: string;
  } | null>(null);

  const availableToReserve = useMemo(
    () => allEquipment.filter((e) => canBeAddedToReserveList(e)),
    [allEquipment]
  );

  const reserved = useMemo(
    () =>
      allEquipment
        .filter((e) => isReserved(e))
        .sort((a, b) => (b.reservedAt ?? 0) - (a.reservedAt ?? 0)),
    [allEquipment]
  );

  const tabs = useMemo(() => {
    const filed = new Set(categories.flatMap((c) => c.equipmentIds));
    const list: { id: CategoryTabId; label: string; count: number }[] = [
      { id: "all", label: "All", count: availableToReserve.length },
    ];
    for (const cat of categories) {
      list.push({
        id: cat.id,
        label: cat.name,
        count: availableToReserve.filter((e) => cat.equipmentIds.includes(e.id))
          .length,
      });
    }
    list.push({
      id: "uncategorized",
      label: "Uncategorized",
      count: availableToReserve.filter((e) => !filed.has(e.id)).length,
    });
    return list;
  }, [categories, availableToReserve]);

  const equipmentByTab = useMemo(
    () => filterEquipmentByCategoryTab(availableToReserve, categories, activeTab),
    [availableToReserve, categories, activeTab]
  );

  const grouped = useMemo(
    () => groupByCategory(equipmentByTab, categories),
    [equipmentByTab, categories]
  );

  const reservedGrouped = useMemo(
    () => groupByCategory(reserved, categories),
    [reserved, categories]
  );

  const syncError = eqError || catError || loanError;
  const now = useMemo(() => new Date(), []);

  const addToStaging = (item: Equipment) => {
    if (staging.some((i) => i.id === item.id)) {
      setFeedback({
        tone: "error",
        message: `"${item.name}" is already on the reserve list.`,
      });
      return;
    }
    setStaging((prev) => [...prev, item]);
    setFeedback({
      tone: "success",
      message: `Added "${item.name}" to the reserve list.`,
    });
  };

  const isInStaging = (id: string) => staging.some((i) => i.id === id);

  const removeFromStaging = (id: string) => {
    setStaging((prev) => prev.filter((i) => i.id !== id));
  };

  const confirmReserve = async () => {
    if (!staging.length) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await reserveEquipmentBatch(
        staging.map((i) => i.id),
        reserveNote
      );
      setMessage(
        `Reserved ${staging.length} item${staging.length === 1 ? "" : "s"}. Members will not see them on Borrow equipment.`
      );
      setStaging([]);
      setReserveNote("");
      setTab("list");
    } catch {
      setError("Could not reserve equipment. Check you are signed in as admin.");
    } finally {
      setBusy(false);
    }
  };

  const releaseOne = async (item: Equipment) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await releaseEquipment(item.id);
      setMessage(`Released ${item.name} for member loans.`);
    } catch {
      setError("Could not release equipment.");
    } finally {
      setBusy(false);
    }
  };

  const releaseAll = async () => {
    if (!reserved.length) return;
    if (
      !window.confirm(
        `Release all ${reserved.length} reserved items back to the borrow list?`
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await releaseEquipmentBatch(reserved.map((e) => e.id));
      setMessage(`Released ${reserved.length} items for member loans.`);
    } catch {
      setError("Could not release equipment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Reserve equipment">
      <p className="text-sm text-zinc-500">
        Hold equipment for major events. Reserved items are hidden from the member
        borrow page until you release them.
      </p>
      <LiveSyncBanner error={syncError} />

      <div className="mt-4 flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setTab("add")}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tab === "add"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-zinc-500"
          }`}
        >
          Add to reserve
          {staging.length > 0 && (
            <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 text-xs text-violet-900">
              {staging.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("list")}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tab === "list"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-zinc-500"
          }`}
        >
          Reserved list
          <span className="ml-1.5 text-xs opacity-70">({reserved.length})</span>
        </button>
      </div>

      {message && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {feedback && tab === "add" && (
        <p
          className={`mt-4 rounded-lg px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
          role="alert"
        >
          {feedback.message}
        </p>
      )}

      {tab === "add" ? (
        <>
          {staging.length > 0 && (
            <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950/30">
              <p className="text-sm font-medium text-violet-900 dark:text-violet-200">
                Reserve list ({staging.length})
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {staging.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <span>
                      {item.name}{" "}
                      <span className="text-zinc-500">({item.equipmentId})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromStaging(item.id)}
                      className="text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <label className="mt-3 block text-sm">
                <span className="font-medium">Event note (optional)</span>
                <input
                  className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 dark:border-violet-700 dark:bg-zinc-900"
                  value={reserveNote}
                  onChange={(e) => setReserveNote(e.target.value)}
                  placeholder="e.g. Annual dinner coverage"
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={confirmReserve}
                className="mt-3 w-full rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {busy ? "Saving…" : "Confirm reserve"}
              </button>
            </div>
          )}

          <SearchBar value={search} onChange={setSearch} className="mt-4" />

          <div className="mt-4 border-b border-zinc-200 dark:border-zinc-700">
            <div className="flex gap-1 overflow-x-auto pb-0">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`shrink-0 rounded-t-lg border border-b-0 px-4 py-2 text-sm font-medium transition ${
                    activeTab === t.id
                      ? "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900"
                      : "border-transparent bg-zinc-100 text-zinc-600 dark:bg-zinc-800"
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 text-xs opacity-70">({t.count})</span>
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
                allowAddWhenLoaned
                isInCart={isInStaging}
                inCartLabel="In list"
                onAdd={addToStaging}
              />
            )}
          </div>
        </>
      ) : (
        <div className="mt-4">
          {reserved.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={releaseAll}
              className="mb-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-600"
            >
              Release all ({reserved.length})
            </button>
          )}
          <SearchBar value={search} onChange={setSearch} />
          {!reserved.length ? (
            <p className="mt-4 text-sm text-zinc-500">No equipment is reserved.</p>
          ) : (
            <div className="mt-4 space-y-8">
              {reservedGrouped.map(({ categoryName, items }) => {
                const filtered = items.filter(
                  (e) =>
                    !search.trim() ||
                    e.name.toLowerCase().includes(search.trim().toLowerCase()) ||
                    e.equipmentId.toLowerCase().includes(search.trim().toLowerCase())
                );
                if (!filtered.length) return null;
                return (
                  <section key={categoryName}>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                      {categoryName}
                    </h3>
                    <ul className="space-y-2">
                      {filtered.map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-800 dark:bg-violet-950/30"
                        >
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-zinc-500">
                              ID: {item.equipmentId}
                            </p>
                            {item.reservedNote && (
                              <p className="mt-1 text-sm text-violet-800 dark:text-violet-300">
                                {item.reservedNote}
                              </p>
                            )}
                            {item.reservedAt && (
                              <p className="text-xs text-zinc-400">
                                Reserved {formatTimestamp(item.reservedAt)}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => releaseOne(item)}
                            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-violet-900 shadow-sm ring-1 ring-violet-200 disabled:opacity-40 dark:bg-zinc-900 dark:ring-violet-800"
                          >
                            Release
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
