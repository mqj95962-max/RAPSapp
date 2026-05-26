"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { SearchBar } from "@/components/SearchBar";
import {
  EQUIPMENT_STATUS_COLORS,
  EQUIPMENT_STATUS_LABELS,
} from "@/lib/equipment";
import {
  fetchCategories,
  fetchEquipment,
  saveCategory,
  saveEquipment,
  softDeleteEquipment,
} from "@/lib/firestore";
import type { Category, Equipment, EquipmentStatus } from "@/lib/types";

const STATUSES: EquipmentStatus[] = ["working", "faulty", "broken", "missing"];

export default function ManageEquipmentPage() {
  return (
    <AdminGuard role="quartermaster">
      <ManageContent />
    </AdminGuard>
  );
}

function ManageContent() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [statusItem, setStatusItem] = useState<Equipment | null>(null);
  const [detailItem, setDetailItem] = useState<Equipment | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [fileTarget, setFileTarget] = useState<Equipment | null>(null);

  const load = useCallback(async () => {
    const [eq, cats] = await Promise.all([fetchEquipment(), fetchCategories()]);
    setEquipment(eq);
    setCategories(cats);
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

  const addEquipment = async () => {
    const name = prompt("Equipment name?");
    const equipmentId = prompt("Equipment ID (manual)?");
    if (!name?.trim() || !equipmentId?.trim()) return;
    await saveEquipment({
      name: name.trim(),
      equipmentId: equipmentId.trim(),
      status: "working",
      statusDetails: "",
      categoryIds: [],
      deletedAt: null,
    });
    load();
  };

  const renameEquipment = async (item: Equipment) => {
    const name = prompt("New name", item.name);
    const equipmentId = prompt("Equipment ID", item.equipmentId);
    if (!name?.trim() || !equipmentId?.trim()) return;
    await saveEquipment({
      ...item,
      name: name.trim(),
      equipmentId: equipmentId.trim(),
    });
    load();
  };

  const deleteEquipment = async (item: Equipment) => {
    if (!confirm(`Move "${item.name}" to past equipment?`)) return;
    await softDeleteEquipment(item.id);
    load();
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    await saveCategory({ name: newCatName.trim(), equipmentIds: [] });
    setNewCatName("");
    load();
  };

  const fileUnderCategory = async (catId: string, item: Equipment) => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    const ids = [...new Set([...cat.equipmentIds, item.id])];
    await saveCategory({ id: cat.id, name: cat.name, equipmentIds: ids });
    setFileTarget(null);
    load();
  };

  return (
    <AppShell title="Manage equipment">
      <SearchBar value={search} onChange={setSearch} />
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium"
        >
          {editMode ? "Done editing list" : "Edit list"}
        </button>
        {editMode && (
          <button
            type="button"
            onClick={addEquipment}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add equipment
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-700">
        <input
          className="rounded-lg border px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          placeholder="New category name"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
        />
        <button
          type="button"
          onClick={addCategory}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium"
        >
          Add category
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {filtered.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={`h-3 w-3 shrink-0 rounded-full ${EQUIPMENT_STATUS_COLORS[item.status]}`}
              />
              <button
                type="button"
                onClick={() => setDetailItem(item)}
                className="text-left font-medium hover:underline"
              >
                {item.name}
              </button>
              <span className="text-xs text-zinc-500">ID: {item.equipmentId}</span>
              <span className="text-xs text-zinc-400">
                {EQUIPMENT_STATUS_LABELS[item.status]}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStatusItem(item)}
                className="text-sm text-blue-600 hover:underline"
              >
                Update status
              </button>
              <button
                type="button"
                onClick={() => setFileTarget(item)}
                className="text-sm text-zinc-600 hover:underline"
              >
                File equipment
              </button>
              {editMode && (
                <>
                  <button
                    type="button"
                    onClick={() => renameEquipment(item)}
                    className="text-sm hover:underline"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteEquipment(item)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {statusItem && (
        <StatusModal
          item={statusItem}
          onClose={() => setStatusItem(null)}
          onSaved={load}
        />
      )}
      {detailItem && (
        <DetailModal item={detailItem} onClose={() => setDetailItem(null)} />
      )}
      {fileTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 dark:bg-zinc-900">
            <h3 className="font-semibold">File under category</h3>
            <p className="text-sm text-zinc-500">{fileTarget.name}</p>
            <ul className="mt-3 space-y-1">
              {categories.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => fileUnderCategory(c.id, fileTarget)}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-3 text-sm text-zinc-500"
              onClick={() => setFileTarget(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatusModal({
  item,
  onClose,
  onSaved,
}: {
  item: Equipment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(item.status);
  const [details, setDetails] = useState(item.statusDetails);

  const save = async () => {
    await saveEquipment({ ...item, status, statusDetails: details });
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-zinc-900">
        <h3 className="font-semibold">Update status — {item.name}</h3>
        <div className="mt-3 space-y-2">
          {STATUSES.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="status"
                checked={status === s}
                onChange={() => setStatus(s)}
              />
              <span
                className={`inline-block h-2 w-2 rounded-full ${EQUIPMENT_STATUS_COLORS[s]}`}
              />
              {EQUIPMENT_STATUS_LABELS[s]}
            </label>
          ))}
        </div>
        <textarea
          className="mt-3 w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          rows={3}
          placeholder="Status details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={save}
            className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Save
          </button>
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border py-2 text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ item, onClose }: { item: Equipment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-zinc-900">
        <h3 className="font-semibold">{item.name}</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-zinc-500">Equipment ID</dt>
            <dd>{item.equipmentId}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Status</dt>
            <dd>{EQUIPMENT_STATUS_LABELS[item.status]}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Details</dt>
            <dd>{item.statusDetails || "—"}</dd>
          </div>
        </dl>
        <button type="button" onClick={onClose} className="mt-4 text-sm text-zinc-500">
          Close
        </button>
      </div>
    </div>
  );
}
