"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { Modal } from "@/components/Modal";
import { SearchBar } from "@/components/SearchBar";
import {
  EQUIPMENT_STATUS_COLORS,
  EQUIPMENT_STATUS_LABELS,
  categoriesForEquipment,
  filterEquipmentByCategoryTab,
  type CategoryTabId,
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
    <AdminGuard>
      <ManageContent />
    </AdminGuard>
  );
}

function ManageContent() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<CategoryTabId>("all");
  const [editMode, setEditMode] = useState(false);

  const [equipmentForm, setEquipmentForm] = useState<
    { mode: "add" } | { mode: "edit"; item: Equipment } | null
  >(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [statusItem, setStatusItem] = useState<Equipment | null>(null);
  const [detailItem, setDetailItem] = useState<Equipment | null>(null);
  const [fileTarget, setFileTarget] = useState<Equipment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);

  const load = useCallback(async () => {
    const [eq, cats] = await Promise.all([fetchEquipment(), fetchCategories()]);
    setEquipment(eq);
    setCategories(cats);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    const byTab = filterEquipmentByCategoryTab(equipment, categories, activeTab);
    if (!q) return byTab;
    return byTab.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.equipmentId.toLowerCase().includes(q)
    );
  }, [equipment, categories, activeTab, q]);

  const tabs = useMemo(() => {
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
    const filed = new Set(categories.flatMap((c) => c.equipmentIds));
    const uncatCount = equipment.filter((e) => !filed.has(e.id)).length;
    list.push({ id: "uncategorized", label: "Uncategorized", count: uncatCount });
    return list;
  }, [equipment, categories]);

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
            onClick={() => setEquipmentForm({ mode: "add" })}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add equipment
          </button>
        )}
        <button
          type="button"
          onClick={() => setCategoryFormOpen(true)}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium"
        >
          Add category
        </button>
      </div>

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

      <p className="mt-4 text-sm text-zinc-500">
        {filtered.length} item{filtered.length === 1 ? "" : "s"} in this category
      </p>

      <ul className="mt-3 space-y-2">
        {filtered.map((item) => {
          const itemCats = categoriesForEquipment(item.id, categories);
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="min-w-0 flex-1">
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
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {itemCats.length ? (
                    itemCats.map((c) => (
                      <span
                        key={c.id}
                        className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      >
                        {c.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-400">No category</span>
                  )}
                  <span className="text-xs text-zinc-400">
                    · {EQUIPMENT_STATUS_LABELS[item.status]}
                  </span>
                </div>
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
                      onClick={() => setEquipmentForm({ mode: "edit", item })}
                      className="text-sm hover:underline"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
        {!filtered.length && (
          <li className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-600">
            No equipment in this category.
            {editMode && activeTab !== "all" && (
              <span> Use &quot;File equipment&quot; to assign items here.</span>
            )}
          </li>
        )}
      </ul>

      {equipmentForm && (
        <EquipmentFormModal
          mode={equipmentForm.mode}
          item={equipmentForm.mode === "edit" ? equipmentForm.item : undefined}
          onClose={() => setEquipmentForm(null)}
          onSaved={load}
        />
      )}

      {categoryFormOpen && (
        <CategoryFormModal
          onClose={() => setCategoryFormOpen(false)}
          onSaved={load}
        />
      )}

      {statusItem && (
        <StatusModal
          item={statusItem}
          onClose={() => setStatusItem(null)}
          onSaved={load}
        />
      )}

      {detailItem && (
        <DetailModal
          item={detailItem}
          categories={categoriesForEquipment(detailItem.id, categories)}
          onClose={() => setDetailItem(null)}
        />
      )}

      {fileTarget && (
        <Modal title="File under category" onClose={() => setFileTarget(null)}>
          <p className="text-sm text-zinc-500">{fileTarget.name}</p>
          {categories.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              No categories yet. Add a category first.
            </p>
          ) : (
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
          )}
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete equipment?" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Move <strong>{deleteTarget.name}</strong> to past equipment? This can be
            restored from the archive view only (not permanently deleted).
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await softDeleteEquipment(deleteTarget.id);
                setDeleteTarget(null);
                load();
              }}
              className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white"
            >
              Move to past equipment
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
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

function EquipmentFormModal({
  mode,
  item,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  item?: Equipment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [equipmentId, setEquipmentId] = useState(item?.equipmentId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSave = name.trim() && equipmentId.trim() && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      if (mode === "add") {
        await saveEquipment({
          name: name.trim(),
          equipmentId: equipmentId.trim(),
          status: "working",
          statusDetails: "",
          categoryIds: [] as string[],
          deletedAt: null,
        });
      } else if (item) {
        await saveEquipment({
          ...item,
          name: name.trim(),
          equipmentId: equipmentId.trim(),
        });
      }
      onSaved();
      onClose();
    } catch {
      setError("Could not save equipment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={mode === "add" ? "Add equipment" : "Rename equipment"}
      onClose={onClose}
    >
      <label className="block text-sm">
        <span className="font-medium">Equipment name</span>
        <input
          className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </label>
      <label className="mt-3 block text-sm">
        <span className="font-medium">Equipment ID</span>
        <input
          className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
          value={equipmentId}
          onChange={(e) => setEquipmentId(e.target.value)}
          placeholder="Manual ID label"
        />
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={!canSave}
          onClick={save}
          className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onClose} className="flex-1 rounded-lg border py-2 text-sm">
          Cancel
        </button>
      </div>
    </Modal>
  );
}

function CategoryFormModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await saveCategory({ name: name.trim(), equipmentIds: [] });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add category" onClose={onClose}>
      <label className="block text-sm">
        <span className="font-medium">Category name</span>
        <input
          className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Lights, Cameras, Lenses"
          autoFocus
        />
      </label>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={!name.trim() || saving}
          onClick={save}
          className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? "Saving…" : "Add category"}
        </button>
        <button type="button" onClick={onClose} className="flex-1 rounded-lg border py-2 text-sm">
          Cancel
        </button>
      </div>
    </Modal>
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
    <Modal title={`Update status — ${item.name}`} onClose={onClose}>
      <div className="space-y-2">
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
    </Modal>
  );
}

function DetailModal({
  item,
  categories,
  onClose,
}: {
  item: Equipment;
  categories: Category[];
  onClose: () => void;
}) {
  return (
    <Modal title={item.name} onClose={onClose}>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-zinc-500">Equipment ID</dt>
          <dd>{item.equipmentId}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Status</dt>
          <dd>{EQUIPMENT_STATUS_LABELS[item.status]}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Categories</dt>
          <dd>
            {categories.length
              ? categories.map((c) => c.name).join(", ")
              : "None"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Details</dt>
          <dd>{item.statusDetails || "—"}</dd>
        </div>
      </dl>
    </Modal>
  );
}
