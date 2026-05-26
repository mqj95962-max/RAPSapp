"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { SearchBar } from "@/components/SearchBar";
import { fetchPastEquipment } from "@/lib/firestore";
import { EQUIPMENT_STATUS_LABELS } from "@/lib/equipment";
import type { Equipment } from "@/lib/types";

export default function PastEquipmentPage() {
  return (
    <AdminGuard>
      <PastEquipmentContent />
    </AdminGuard>
  );
}

function PastEquipmentContent() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setEquipment(await fetchPastEquipment());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = search.trim().toLowerCase();
  const filtered = equipment.filter(
    (e) =>
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.equipmentId.toLowerCase().includes(q)
  );

  return (
    <AppShell title="Past equipment">
      <SearchBar value={search} onChange={setSearch} />
      <ul className="mt-4 space-y-2">
        {filtered.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <p className="font-medium">{item.name}</p>
            <p className="text-zinc-500">
              ID: {item.equipmentId} · {EQUIPMENT_STATUS_LABELS[item.status]}
            </p>
            {item.deletedAt && (
              <p className="text-xs text-zinc-400">
                Removed {new Date(item.deletedAt).toLocaleString()}
              </p>
            )}
          </li>
        ))}
        {!filtered.length && (
          <li className="text-sm text-zinc-500">No archived equipment.</li>
        )}
      </ul>
    </AppShell>
  );
}
