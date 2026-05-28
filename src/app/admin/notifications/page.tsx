"use client";

import { useCallback, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getFirebaseAuth } from "@/lib/firebase";

interface StatusResponse {
  firebaseAdmin: boolean;
  emailConfigured: boolean;
  smtpUser: string | null;
  staffEmailCount: number;
  staffEmails: string[];
  notifyStaffEmailsEnv: boolean;
  error?: string;
}

export default function NotificationSetupPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authFetch = useCallback(async (path: string, method = "GET") => {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error("Sign in first.");
    const token = await user.getIdToken();
    const res = await fetch(path, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(String(data.error ?? res.statusText));
    }
    return data;
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    setTestMessage(null);
    try {
      setStatus(
        (await authFetch("/api/notifications/status")) as unknown as StatusResponse
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load status.");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async () => {
    setLoading(true);
    setError(null);
    setTestMessage(null);
    try {
      const data = (await authFetch("/api/notifications/test", "POST")) as {
        ok: boolean;
        sentTo: number;
      };
      setTestMessage(`Test email sent to ${data.sentTo} staff inbox(es). Check spam folder too.`);
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Email notifications">
      <p className="text-sm text-zinc-500">
        Use this page to check whether Gmail SMTP and staff recipients are configured on
        Vercel.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={loadStatus}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Check setup
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={sendTest}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-600"
        >
          Send test email to staff
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {testMessage && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {testMessage}
        </p>
      )}

      {status && (
        <dl className="mt-6 space-y-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Firebase Admin on server</dt>
            <dd className="font-medium">{status.firebaseAdmin ? "Yes" : "No"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Gmail SMTP configured</dt>
            <dd className="font-medium">{status.emailConfigured ? "Yes" : "No"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Sending from (SMTP)</dt>
            <dd className="font-medium">{status.smtpUser ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Staff inboxes to notify</dt>
            <dd className="font-medium">{status.staffEmailCount}</dd>
          </div>
          {status.staffEmails.length > 0 && (
            <div>
              <dt className="text-zinc-500">Recipients</dt>
              <dd className="mt-1 font-mono text-xs">{status.staffEmails.join(", ")}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">NOTIFY_STAFF_EMAILS env set</dt>
            <dd className="font-medium">{status.notifyStaffEmailsEnv ? "Yes" : "No"}</dd>
          </div>
        </dl>
      )}

      <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
        <p className="font-medium text-zinc-800 dark:text-zinc-200">Common fixes</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>SMTP_USER</strong> / <strong>SMTP_PASS</strong> on Vercel — use a Google
            App Password, not your normal password.
          </li>
          <li>
            Staff emails come from Firestore <code className="text-xs">users</code> with admin
            role, or set <strong>NOTIFY_STAFF_EMAILS</strong> to your Gmail (comma-separated).
          </li>
          <li>
            The Gmail used for SMTP is only the <em>sender</em>. Check the inbox listed under
            recipients above.
          </li>
          <li>Redeploy Vercel after changing environment variables.</li>
        </ul>
      </div>
    </AppShell>
  );
}
