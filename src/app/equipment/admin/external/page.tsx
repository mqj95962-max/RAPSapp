"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { SearchBar } from "@/components/SearchBar";
import { EquipmentList } from "@/components/equipment/EquipmentList";
import { useAuth } from "@/context/AuthContext";
import { useExternalCart } from "@/context/CartContext";
import { useServerTime } from "@/context/ServerTimeContext";
import {
  createLoanRequest,
  fetchAllLoans,
  fetchCategories,
  fetchEquipment,
} from "@/lib/firestore";
import { groupByCategory, isBorrowable } from "@/lib/equipment";
import type { Category, Equipment, Loan } from "@/lib/types";

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
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState("");
  const [details, setDetails] = useState("");
  const [toast, setToast] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const [eq, cats, allLoans] = await Promise.all([
      fetchEquipment(),
      fetchCategories(),
      fetchAllLoans(),
    ]);
    setEquipment(eq.filter((e) => isBorrowable(e.status)));
    setCategories(cats);
    setLoans(allLoans);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!profile || !items.length || !details.trim()) return;
    setSubmitting(true);
    try {
      await createLoanRequest({
        userId: profile.uid,
        userName: "External",
        userPhone: "—",
        equipment: items.map((e) => ({
          equipmentDocId: e.id,
          equipmentId: e.equipmentId,
          name: e.name,
        })),
        purpose: "External loan",
        isExternal: true,
        externalDetails: details.trim(),
      });
      clear();
      setDetails("");
      router.push("/equipment/admin/member-loans");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="External loans">
      <p className="text-sm text-zinc-500">
        Loan equipment to non-members. Uses a separate cart from personal borrowing.
        Requests appear on Member loans with an EXTERNAL LOAN badge.
      </p>
      <SearchBar value={search} onChange={setSearch} className="mt-4" />
      {toast && <p className="mt-2 text-sm text-red-600">{toast}</p>}
      <EquipmentList
        grouped={groupByCategory(equipment, categories)}
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
