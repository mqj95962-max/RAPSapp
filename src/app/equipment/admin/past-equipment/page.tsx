"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { Modal } from "@/components/Modal";
import { SearchBar } from "@/components/SearchBar";
import { fetchPastEquipment, permanentlyDeleteEquipment } from "@/lib/firestore";
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
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setEquipment(await fetchPastEquipment());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const q = search.trim().toLowerCase();
  const filtered = equipment.filter(
    (e) =>
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.equipmentId.toLowerCase().includes(q)
  );

  const confirmDelete = async () => {
    if (!deleteTarget || confirmText !== "DELETE") return;
    setBusy(true);
    setError(null);
    try {
      await permanentlyDeleteEquipment(deleteTarget.id);
      setDeleteTarget(null);
      setConfirmText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Past equipment">
      <p className="text-sm text-zinc-500">
        Archived equipment. Use Delete data for bulk cleanup, or delete items here.
      </p>
      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <SearchBar value={search} onChange={setSearch} className="mt-4" />
      <ul className="mt-4 space-y-2">
        {filtered.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-zinc-500">
                ID: {item.equipmentId} · {EQUIPMENT_STATUS_LABELS[item.status]}
              </p>
              {item.deletedAt && (
                <p className="text-xs text-zinc-400">
                  Removed {new Date(item.deletedAt).toLocaleString()}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setConfirmText("");
                setDeleteTarget(item);
              }}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700"
            >
              Delete permanently
            </button>
          </li>
        ))}
        {!filtered.length && (
          <li className="text-sm text-zinc-500">No archived equipment.</li>
        )}
      </ul>

      {deleteTarget && (
        <Modal
          title="Delete equipment permanently?"
          onClose={() => {
            if (busy) return;
            setDeleteTarget(null);
            setConfirmText("");
          }}
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Remove <strong>{deleteTarget.name}</strong> from the database? This cannot
            be restored.
          </p>
          <label className="mt-4 block text-sm">
            Type <strong>DELETE</strong> to confirm
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              autoComplete="off"
            />
          </label>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy || confirmText !== "DELETE"}
              onClick={confirmDelete}
              className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy ? "Deleting…" : "Delete permanently"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDeleteTarget(null);
                setConfirmText("");
              }}
              className="flex-1 rounded-lg border py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
