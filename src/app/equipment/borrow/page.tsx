"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { EquipmentList } from "@/components/equipment/EquipmentList";
import { useMemberCart } from "@/context/CartContext";
import { useServerTime } from "@/context/ServerTimeContext";
import { fetchAllLoans, fetchCategories, fetchEquipment } from "@/lib/firestore";
import { groupByCategory, isBorrowable } from "@/lib/equipment";
import type { Equipment, Loan } from "@/lib/types";
import type { Category } from "@/lib/types";

export default function BorrowPage() {
  const { addItem, items } = useMemberCart();
  const { now } = useServerTime();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

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

  const grouped = groupByCategory(equipment, categories);

  return (
    <AppShell title="Borrow equipment">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Working and faulty equipment only. Cart does not reserve items.
        </p>
        <Link
          href="/equipment/cart"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          View cart{items.length > 0 ? ` (${items.length})` : ""}
        </Link>
      </div>
      <SearchBar value={search} onChange={setSearch} />
      {toast && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {toast}
        </p>
      )}
      <div className="mt-4">
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
      </div>
    </AppShell>
  );
}
