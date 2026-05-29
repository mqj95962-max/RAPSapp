"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminGuard } from "@/components/AdminGuard";
import { Modal } from "@/components/Modal";
import { SearchBar } from "@/components/SearchBar";
import { useServerTime } from "@/context/ServerTimeContext";
import { LiveSyncBanner } from "@/components/LiveSyncBanner";
import { useAllLoansLive } from "@/hooks/useLiveData";
import { permanentlyDeleteLoan } from "@/lib/firestore";
import { effectiveLoanStatus, LOAN_STATUS_LABELS } from "@/lib/loans";
import { formatTimestamp } from "@/lib/time";
import type { Loan } from "@/lib/types";

export default function AdminLoanHistoryPage() {
  return (
    <AdminGuard>
      <AdminLoanHistoryContent />
    </AdminGuard>
  );
}

function AdminLoanHistoryContent() {
  const { now } = useServerTime();
  const { loans: allLoans, error } = useAllLoansLive();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Loan | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loans = useMemo(
    () => allLoans.filter((l) => effectiveLoanStatus(l, now) === "returned"),
    [allLoans, now]
  );

  const q = search.trim().toLowerCase();
  const filtered = loans.filter(
    (l) =>
      !q ||
      l.userName.toLowerCase().includes(q) ||
      l.equipment.some(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.equipmentId.toLowerCase().includes(q)
      )
  );

  const confirmDelete = async () => {
    if (!deleteTarget || confirmText !== "DELETE") return;
    setBusy(true);
    setDeleteError(null);
    try {
      await permanentlyDeleteLoan(deleteTarget.id);
      setDeleteTarget(null);
      setConfirmText("");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Loan history (all members)">
      <LiveSyncBanner error={error} />
      <p className="text-sm text-zinc-500">
        Returned loans for all members. Delete entries here to remove them from history.
      </p>
      {deleteError && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {deleteError}
        </p>
      )}
      <SearchBar value={search} onChange={setSearch} placeholder="Search member or equipment…" className="mt-4" />
      <ul className="mt-4 space-y-3">
        {filtered.map((loan) => (
          <li
            key={loan.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div>
              {loan.isExternal && (
                <p className="text-xs font-bold text-blue-700">EXTERNAL LOAN</p>
              )}
              <p className="font-medium">{loan.userName}</p>
              <p>{loan.equipment.map((e) => e.name).join(", ")}</p>
              <p className="text-zinc-500">{loan.purpose}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {LOAN_STATUS_LABELS.returned} · {formatTimestamp(loan.createdAt)}
                {loan.returnedAt && ` · Returned ${formatTimestamp(loan.returnedAt)}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfirmText("");
                setDeleteError(null);
                setDeleteTarget(loan);
              }}
              className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700"
            >
              Delete
            </button>
          </li>
        ))}
        {!filtered.length && (
          <li className="text-sm text-zinc-500">No archived loans yet.</li>
        )}
      </ul>

      {deleteTarget && (
        <Modal
          title="Delete loan history?"
          onClose={() => {
            if (busy) return;
            setDeleteTarget(null);
            setConfirmText("");
          }}
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Permanently remove this returned loan for{" "}
            <strong>{deleteTarget.userName}</strong> (
            {deleteTarget.equipment.map((e) => e.name).join(", ")})? This cannot be
            restored.
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
