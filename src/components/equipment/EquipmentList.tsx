"use client";

import type { Equipment, EquipmentAvailability } from "@/lib/types";
import {
  EQUIPMENT_STATUS_COLORS,
  getEquipmentAvailability,
} from "@/lib/equipment";
import type { Loan } from "@/lib/types";

const AVAIL_LABELS: Record<EquipmentAvailability, string> = {
  available: "Available",
  loaned: "Loaned",
  external_loan: "External loan",
};

const AVAIL_STYLES: Record<EquipmentAvailability, string> = {
  available: "text-emerald-700 bg-emerald-50",
  loaned: "text-amber-800 bg-amber-50",
  external_loan: "text-blue-800 bg-blue-50",
};

interface EquipmentListProps {
  grouped: { categoryName: string; items: Equipment[] }[];
  loans: Loan[];
  now: Date;
  search: string;
  onAdd?: (item: Equipment) => void;
  onUnavailable?: (name: string) => void;
  isInCart?: (id: string) => boolean;
  inCartLabel?: string;
  showAddButton?: boolean;
  /** When true, allow + even if item is on loan (admin reserve / external flows). */
  allowAddWhenLoaned?: boolean;
}

export function EquipmentList({
  grouped,
  loans,
  now,
  search,
  onAdd,
  onUnavailable,
  isInCart,
  inCartLabel = "In cart",
  showAddButton = true,
  allowAddWhenLoaned = false,
}: EquipmentListProps) {
  const q = search.trim().toLowerCase();

  return (
    <div className="space-y-8">
      {grouped.map(({ categoryName, items }) => {
        const filtered = items.filter(
          (e) =>
            !q ||
            e.name.toLowerCase().includes(q) ||
            e.equipmentId.toLowerCase().includes(q)
        );
        if (!filtered.length) return null;

        return (
          <section key={categoryName}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {categoryName}
            </h3>
            <ul className="space-y-2">
              {filtered.map((item) => {
                const avail = getEquipmentAvailability(item.id, loans, now);
                const canBorrow = avail === "available";
                const canAdd = allowAddWhenLoaned || canBorrow;

                return (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`h-3 w-3 shrink-0 rounded-full ${EQUIPMENT_STATUS_COLORS[item.status]}`}
                        title={item.status}
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-xs text-zinc-500">ID: {item.equipmentId}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${AVAIL_STYLES[avail]}`}
                      >
                        {AVAIL_LABELS[avail]}
                      </span>
                      {showAddButton && onAdd && (
                        isInCart?.(item.id) ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                            {inCartLabel}
                          </span>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Add ${item.name} to cart`}
                            onClick={() => {
                              if (!canAdd) {
                                onUnavailable?.(item.name);
                                return;
                              }
                              onAdd(item);
                            }}
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold ${
                              canAdd
                                ? "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                                : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                            }`}
                          >
                            +
                          </button>
                        )
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
