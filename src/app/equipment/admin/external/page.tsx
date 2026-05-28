"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { SearchBar } from "@/components/SearchBar";
import { EquipmentList } from "@/components/equipment/EquipmentList";
import { useAuth } from "@/context/AuthContext";
import { useExternalCart } from "@/context/CartContext";
import { useServerTime } from "@/context/ServerTimeContext";
import { LiveSyncBanner } from "@/components/LiveSyncBanner";
import {
  useAllLoansLive,
  useCategoriesLive,
  useEquipmentLive,
} from "@/hooks/useLiveData";
import { createLoanRequest } from "@/lib/firestore";
import { sendNotification } from "@/lib/notifications";
import {
  filterEquipmentByCategoryTab,
  groupByCategory,
  isBorrowable,
  type CategoryTabId,
} from "@/lib/equipment";

export default function ExternalLoansPage() {
  return (
    <AdminGuard>
      <ExternalLoansContent />
    </AdminGuard>
  );
}

function ExternalLoansContent() {
  const { profile } = useAuth();
  const { items, addItem, removeItem, clear } = useExternalCart();
  const { now } = useServerTime();
  const router = useRouter();
  const { equipment: allEquipment, loading: eqLoading, error: eqError } =
    useEquipmentLive();
  const { categories, loading: catLoading, error: catError } =
    useCategoriesLive();
  const { loans, error: loanError } = useAllLoansLive();
  const [search, setSearch] = useState("");
  const [details, setDetails] = useState("");
  const [toast, setToast] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryTabId>("all");

  const equipment = useMemo(
    () => allEquipment.filter((e) => isBorrowable(e.status)),
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

  const submit = async () => {
    if (!profile || !items.length || !details.trim()) return;
    setSubmitting(true);
    try {
      const loanId = await createLoanRequest({
        userId: profile.uid,
        userName: "External",
        equipment: items.map((e) => ({
          equipmentDocId: e.id,
          equipmentId: e.equipmentId,
          name: e.name,
        })),
        purpose: "External loan",
        isExternal: true,
        externalDetails: details.trim(),
      });
      const notifyError = await sendNotification("loan_requested", { loanId });
      if (notifyError) setToast(`Loan saved. Email failed: ${notifyError}`);
      clear();
      setDetails("");
      router.push("/equipment/admin/member-loans");
    } catch {
      setToast("Could not submit external loan. Check Firestore rules.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="External loans">
      <p className="text-sm text-zinc-500">
        Loan equipment to non-members. Uses a separate cart from personal borrowing.
        Equipment list syncs live for all accounts.
      </p>
      <LiveSyncBanner error={syncError} />
      <SearchBar value={search} onChange={setSearch} className="mt-4" />
      {toast && <p className="mt-2 text-sm text-red-600">{toast}</p>}

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
      <EquipmentList
        grouped={grouped}
        loans={loans}
        now={now}
        search={search}
        onAdd={addItem}
        onUnavailable={(name) => setToast(`"${name}" is already loaned out.`)}
      />
      {items.length > 0 && (
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h3 className="font-semibold">External loan cart ({items.length})</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2">
                <span>
                  {i.name} ({i.equipmentId})
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(i.id)}
                  className="text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <textarea
            className="mt-3 w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            rows={3}
            placeholder="Contact details, organisation, notes…"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
          <button
            type="button"
            disabled={submitting || !details.trim()}
            onClick={submit}
            className="mt-3 w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Confirm external loan request
          </button>
        </div>
      )}
    </AppShell>
  );
}
