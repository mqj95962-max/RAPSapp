"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  fetchAllEvents,
  fetchAllLoans,
  fetchAllUsers,
  fetchCategories,
  fetchEquipment,
  fetchFormalEvents,
  fetchPastEquipment,
} from "@/lib/firestore";
import { buildClubExportWorkbook, downloadExcelBuffer, exportFilename } from "@/lib/exportExcel";

export default function ExportDataPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const runExport = async () => {
    setBusy(true);
    setError(null);
    try {
      const exportedAt = new Date();
      const [users, equipmentActive, equipmentArchived, categories, loans, events, formalEvents] =
        await Promise.all([
          fetchAllUsers(),
          fetchEquipment(false),
          fetchPastEquipment(),
          fetchCategories(),
          fetchAllLoans(),
          fetchAllEvents(),
          fetchFormalEvents(),
        ]);

      const buffer = await buildClubExportWorkbook({
        exportedAt,
        users,
        equipmentActive,
        equipmentArchived,
        categories,
        loans,
        events,
        formalEvents,
      });

      const filename = exportFilename(exportedAt);
      downloadExcelBuffer(buffer, filename);
      setLastExport(`${filename} (${exportedAt.toLocaleString()})`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Export failed. Check you are signed in as admin."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Export data">
      <p className="text-sm text-zinc-500">
        Download a formatted Excel workbook (.xlsx) with current Firestore data: members,
        equipment, categories, loans, events, and formal events.
      </p>

      <ul className="mt-4 list-inside list-disc text-sm text-zinc-600 dark:text-zinc-400">
        <li>Equipment grouped by category (active, then archived)</li>
        <li>Status colours match the app (equipment, loans, events)</li>
        <li>Summary sheet with record counts and a colour legend</li>
        <li>Filters and column sizing on data sheets</li>
      </ul>

      <button
        type="button"
        disabled={busy}
        onClick={runExport}
        className="mt-6 w-full max-w-sm rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {busy ? "Preparing export…" : "Download Excel export"}
      </button>

      {lastExport && (
        <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">
          Last download: {lastExport}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </AppShell>
  );
}
