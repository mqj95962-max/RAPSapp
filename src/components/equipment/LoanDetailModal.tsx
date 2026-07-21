"use client";

import { useState } from "react";
import type { Equipment, Loan, LoanEquipmentItem, LoanStatus } from "@/lib/types";
import {
  approveLoan,
  denyLoan,
  extendLoan,
  markLoanReturned,
  activateLoan,
  updateLoanEquipment,
} from "@/lib/firestore";
import {
  filterEquipmentSearch,
  getEquipmentAvailabilityExcludingLoan,
  isBorrowable,
} from "@/lib/equipment";
import { effectiveLoanStatus, LOAN_STATUS_LABELS } from "@/lib/loans";
import { formatDate, formatTimestamp } from "@/lib/time";
import { useAuth } from "@/context/AuthContext";
import { sendNotification } from "@/lib/notifications";

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface LoanDetailModalProps {
  loan: Loan;
  now: Date;
  isAdmin: boolean;
  allEquipment?: Equipment[];
  allLoans?: Loan[];
  onClose: () => void;
  onUpdated: () => void;
}

export function LoanDetailModal({
  loan,
  now,
  isAdmin,
  allEquipment = [],
  allLoans = [],
  onClose,
  onUpdated,
}: LoanDetailModalProps) {
  const { profile } = useAuth();
  const status: LoanStatus = effectiveLoanStatus(loan, now);
  const [pickupDate, setPickupDate] = useState(loan.pickupDate ?? "");
  const [returnDate, setReturnDate] = useState(loan.returnDate ?? "");
  const [note, setNote] = useState("");
  const [extensionNote, setExtensionNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingEquipment, setEditingEquipment] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [editedEquipment, setEditedEquipment] = useState<LoanEquipmentItem[]>(
    loan.equipment
  );

  const canApprove = Boolean(pickupDate && note.trim() && !busy);
  const canDeny = Boolean(note.trim() && !busy);
  const canEditEquipment =
    isAdmin &&
    (status === "pending" ||
      status === "approved" ||
      status === "active" ||
      status === "overdue");
  const editedEquipmentIds = new Set(
    editedEquipment.map((item) => item.equipmentDocId)
  );
  const equipmentOptions = filterEquipmentSearch(
    allEquipment.filter(
      (item) =>
        !item.deletedAt &&
        !item.reservedAt &&
        isBorrowable(item.status) &&
        !editedEquipmentIds.has(item.id)
    ),
    equipmentSearch
  );

  const addEquipment = (item: Equipment) => {
    const availability = getEquipmentAvailabilityExcludingLoan(
      item.id,
      allLoans,
      now,
      loan.id
    );
    if (availability !== "available") {
      setError(
        `${item.name} is already assigned to another approved or active loan.`
      );
      return;
    }
    setError("");
    setEditedEquipment((current) => [
      ...current,
      {
        equipmentDocId: item.id,
        equipmentId: item.equipmentId,
        name: item.name,
      },
    ]);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      onUpdated();
      onClose();
    } catch {
      setError("Action failed. Check permissions and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">Loan details</h2>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-800">
            ✕
          </button>
        </div>
        {loan.isExternal && (
          <p className="mt-1 text-sm font-bold text-blue-700">EXTERNAL LOAN</p>
        )}
        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="text-zinc-500">Member</dt>
            <dd className="font-medium">{loan.userName}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Status</dt>
            <dd>{LOAN_STATUS_LABELS[status]}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Requested</dt>
            <dd>{formatTimestamp(loan.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Purpose</dt>
            <dd>{loan.purpose || "—"}</dd>
          </div>
          {loan.isExternal && loan.externalDetails && (
            <div>
              <dt className="text-zinc-500">External details</dt>
              <dd>{loan.externalDetails}</dd>
            </div>
          )}
          <div>
            <dt className="flex items-center justify-between gap-3 text-zinc-500">
              <span>Equipment</span>
              {canEditEquipment && !editingEquipment && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditedEquipment(loan.equipment);
                    setEquipmentSearch("");
                    setError("");
                    setEditingEquipment(true);
                  }}
                  className="font-medium text-blue-700 disabled:opacity-40"
                >
                  Edit equipment
                </button>
              )}
            </dt>
            <dd>
              <ul className="mt-1 space-y-1">
                {loan.equipment.map((e) => (
                  <li key={e.equipmentDocId} className="list-inside list-disc">
                    {e.name} ({e.equipmentId})
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          {loan.returnDate && (
            <div>
              <dt className="text-zinc-500">Return date</dt>
              <dd>{formatDate(loan.returnDate)}</dd>
            </div>
          )}
          {loan.approvalNote && (
            <div>
              <dt className="text-zinc-500">Approval note</dt>
              <dd>{loan.approvalNote}</dd>
            </div>
          )}
        </dl>

        {editingEquipment && (
          <div className="mt-4 space-y-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
            <div>
              <h3 className="text-sm font-semibold">Edit loan equipment</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Members cannot access this editor. Changes apply only to this loan.
              </p>
            </div>
            <ul className="space-y-2">
              {editedEquipment.map((item) => (
                <li
                  key={item.equipmentDocId}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm dark:bg-zinc-900"
                >
                  <span>
                    {item.name} ({item.equipmentId})
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setEditedEquipment((current) =>
                        current.filter(
                          (entry) =>
                            entry.equipmentDocId !== item.equipmentDocId
                        )
                      )
                    }
                    className="shrink-0 text-xs font-medium text-red-700 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            {!editedEquipment.length && (
              <p className="text-sm font-medium text-red-700">
                Add at least one item before saving.
              </p>
            )}
            <label className="block text-sm">
              <span className="font-medium">Add equipment</span>
              <input
                value={equipmentSearch}
                onChange={(event) => setEquipmentSearch(event.target.value)}
                placeholder="Search equipment name or ID…"
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              />
            </label>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {equipmentOptions.map((item) => {
                const availability = getEquipmentAvailabilityExcludingLoan(
                  item.id,
                  allLoans,
                  now,
                  loan.id
                );
                const unavailable = availability !== "available";
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={busy || unavailable}
                    onClick={() => addEquipment(item)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <span>
                      {item.name} ({item.equipmentId})
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {unavailable ? "In another loan" : "Add"}
                    </span>
                  </button>
                );
              })}
              {!equipmentOptions.length && (
                <p className="py-2 text-sm text-zinc-500">
                  No additional equipment found.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy || !editedEquipment.length}
                onClick={() =>
                  run(() => updateLoanEquipment(loan.id, editedEquipment))
                }
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {busy ? "Saving…" : "Save equipment"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEditedEquipment(loan.equipment);
                  setEditingEquipment(false);
                  setError("");
                }}
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isAdmin && status === "pending" && (
          <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
            <label className="block text-sm">
              <span className="font-medium">Pickup date (required to approve)</span>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                value={pickupDate}
                min={toDateInputValue(now)}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Note (required)</span>
              <textarea
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for approval or denial"
              />
            </label>
            {!canApprove && note.trim() && !pickupDate && (
              <p className="text-xs text-amber-700">Select a pickup date to enable Approve.</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canApprove}
                onClick={() =>
                  run(async () => {
                    await approveLoan(loan.id, pickupDate, note.trim(), profile!.uid);
                    const err = await sendNotification("loan_approved", {
                      loanId: loan.id,
                    });
                    if (err) console.warn("[notifications]", err);
                  })
                }
                className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={!canDeny}
                onClick={() =>
                  run(async () => {
                    await denyLoan(loan.id, note.trim(), profile!.uid);
                    const err = await sendNotification("loan_denied", {
                      loanId: loan.id,
                    });
                    if (err) console.warn("[notifications]", err);
                  })
                }
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Deny
              </button>
            </div>
          </div>
        )}

        {isAdmin && status === "approved" && (
          <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(() => activateLoan(loan.id, loan.pickupDate ?? pickupDate))
              }
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Confirm pickup (starts 7-day loan)
            </button>
          </div>
        )}

        {isAdmin && (status === "active" || status === "overdue") && (
          <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
            <label className="block text-sm">
              <span className="font-medium">Extend return date</span>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </label>
            <textarea
              className="w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              rows={2}
              placeholder="Reason for extension"
              value={extensionNote}
              onChange={(e) => setExtensionNote(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || !returnDate || !extensionNote.trim()}
              onClick={() =>
                run(() => extendLoan(loan.id, returnDate, extensionNote.trim()))
              }
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium disabled:opacity-40"
            >
              Extend loan period
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => markLoanReturned(loan.id))}
              className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Mark returned
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
