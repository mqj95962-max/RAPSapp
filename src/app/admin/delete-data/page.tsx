"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LiveSyncBanner } from "@/components/LiveSyncBanner";
import { Modal } from "@/components/Modal";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { useAllUsersLive } from "@/hooks/useLiveData";
import { deleteUserAccount } from "@/lib/adminDelete";
import {
  fetchPastEquipment,
  permanentlyDeleteEquipment,
} from "@/lib/firestore";
import { EQUIPMENT_STATUS_LABELS } from "@/lib/equipment";
import { isAdmin } from "@/lib/roles";
import type { Equipment, UserProfile } from "@/lib/types";

export default function DeleteDataPage() {
  return <DeleteDataContent />;
}

function DeleteDataContent() {
  const { user } = useAuth();
  const { users, loading: usersLoading, error: usersError } = useAllUsersLive();
  const [memberSearch, setMemberSearch] = useState("");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(true);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [equipmentError, setEquipmentError] = useState<string | null>(null);
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<UserProfile | null>(
    null
  );
  const [deleteEquipmentTarget, setDeleteEquipmentTarget] = useState<Equipment | null>(
    null
  );
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadEquipment = useCallback(async () => {
    setEquipmentLoading(true);
    setEquipmentError(null);
    try {
      setEquipment(await fetchPastEquipment());
    } catch (e) {
      setEquipmentError(e instanceof Error ? e.message : "Failed to load equipment.");
    } finally {
      setEquipmentLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEquipment();
  }, [loadEquipment]);

  const memberQuery = memberSearch.trim().toLowerCase();
  const filteredMembers = users.filter((member) => {
    if (!memberQuery) return true;
    return (
      member.displayName.toLowerCase().includes(memberQuery) ||
      member.phone.toLowerCase().includes(memberQuery) ||
      member.email.toLowerCase().includes(memberQuery)
    );
  });

  const equipmentQuery = equipmentSearch.trim().toLowerCase();
  const filteredEquipment = useMemo(
    () =>
      equipment.filter(
        (item) =>
          !equipmentQuery ||
          item.name.toLowerCase().includes(equipmentQuery) ||
          item.equipmentId.toLowerCase().includes(equipmentQuery)
      ),
    [equipment, equipmentQuery]
  );

  const confirmDeleteMember = async () => {
    if (!deleteMemberTarget || confirmText !== "DELETE") return;
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await deleteUserAccount(deleteMemberTarget.uid);
      setStatusMessage(
        `${deleteMemberTarget.displayName || deleteMemberTarget.email} was removed from the database.`
      );
      setDeleteMemberTarget(null);
      setConfirmText("");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteEquipment = async () => {
    if (!deleteEquipmentTarget || confirmText !== "DELETE") return;
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await permanentlyDeleteEquipment(deleteEquipmentTarget.id);
      setStatusMessage(
        `${deleteEquipmentTarget.name} was permanently removed from the database.`
      );
      setDeleteEquipmentTarget(null);
      setConfirmText("");
      await loadEquipment();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const openMemberDelete = (member: UserProfile) => {
    setConfirmText("");
    setDeleteMemberTarget(member);
  };

  const openEquipmentDelete = (item: Equipment) => {
    setConfirmText("");
    setDeleteEquipmentTarget(item);
  };

  return (
    <AppShell title="Delete data">
      <p className="text-sm text-zinc-500">
        Permanently remove test accounts and archived equipment before launch. These
        actions cannot be undone.
      </p>

      {statusMessage && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {statusMessage}
        </p>
      )}
      {errorMessage && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {errorMessage}
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Member accounts</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Removes the member profile, events, loans, and formal event signups from
          the database. They can sign in again later and will start with a blank
          profile.
        </p>
        <LiveSyncBanner error={usersError} />
        <SearchBar
          value={memberSearch}
          onChange={setMemberSearch}
          placeholder="Search members…"
          className="mt-4"
        />
        {usersLoading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading members…</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {filteredMembers.map((member) => {
              const displayName = member.displayName.trim() || "No name set";
              const email = member.email.trim() || "No email";
              const admin = isAdmin(member);
              const isSelf = member.uid === user?.uid;

              return (
                <li
                  key={member.uid}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div>
                    <p className="font-medium">{displayName}</p>
                    <p className="text-sm text-zinc-500">{email}</p>
                    {admin && (
                      <p className="mt-1 text-xs text-amber-700">Admin account</p>
                    )}
                    {isSelf && (
                      <p className="mt-1 text-xs text-zinc-400">
                        Your account — cannot delete while signed in
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isSelf}
                    onClick={() => openMemberDelete(member)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Delete account
                  </button>
                </li>
              );
            })}
            {!filteredMembers.length && (
              <li className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-600">
                No members found.
              </li>
            )}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Past equipment</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Permanently removes archived equipment from Firestore and uncategorizes it.
        </p>
        {equipmentError && (
          <p className="mt-3 text-sm text-red-600">{equipmentError}</p>
        )}
        <SearchBar
          value={equipmentSearch}
          onChange={setEquipmentSearch}
          placeholder="Search past equipment…"
          className="mt-4"
        />
        {equipmentLoading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading past equipment…</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {filteredEquipment.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-zinc-500">
                    ID: {item.equipmentId} · {EQUIPMENT_STATUS_LABELS[item.status]}
                  </p>
                  {item.deletedAt && (
                    <p className="text-xs text-zinc-400">
                      Archived {new Date(item.deletedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openEquipmentDelete(item)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700"
                >
                  Delete permanently
                </button>
              </li>
            ))}
            {!filteredEquipment.length && (
              <li className="text-sm text-zinc-500">No archived equipment.</li>
            )}
          </ul>
        )}
      </section>

      {deleteMemberTarget && (
        <Modal
          title="Delete member account?"
          onClose={() => {
            if (busy) return;
            setDeleteMemberTarget(null);
            setConfirmText("");
          }}
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Permanently delete{" "}
            <strong>
              {deleteMemberTarget.displayName || deleteMemberTarget.email}
            </strong>
            ? This removes their profile, events, loans, and signups.
          </p>
          {isAdmin(deleteMemberTarget) && (
            <p className="mt-2 text-sm text-amber-700">
              This member has admin access. Make sure at least one other admin remains.
            </p>
          )}
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
              onClick={confirmDeleteMember}
              className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy ? "Deleting…" : "Delete permanently"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDeleteMemberTarget(null);
                setConfirmText("");
              }}
              className="flex-1 rounded-lg border py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {deleteEquipmentTarget && (
        <Modal
          title="Delete equipment permanently?"
          onClose={() => {
            if (busy) return;
            setDeleteEquipmentTarget(null);
            setConfirmText("");
          }}
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Remove <strong>{deleteEquipmentTarget.name}</strong> from the database?
            This cannot be restored.
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
              onClick={confirmDeleteEquipment}
              className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy ? "Deleting…" : "Delete permanently"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDeleteEquipmentTarget(null);
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
