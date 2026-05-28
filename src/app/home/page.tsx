"use client";

import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/lib/roles";
import { useServerTime } from "@/context/ServerTimeContext";

export default function HomePage() {
  return (
    <AuthGuard>
      <HomeContent />
    </AuthGuard>
  );
}

function HomeContent() {
  const { profile } = useAuth();
  const { now } = useServerTime();
  const admin = isAdmin(profile);

  return (
    <AppShell title="Home">
      <p className="text-sm text-zinc-500">
        Club time: {now.toLocaleString()} (synced with internet time)
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Equipment</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <NavCard href="/equipment/borrow" label="Borrow equipment" />
          <NavCard href="/equipment/cart" label="View cart" />
          <NavCard href="/equipment/my-loans" label="My loans" />
          <NavCard href="/equipment/loan-history" label="Loan history" />
          {admin && (
            <>
              <NavCard href="/equipment/admin/member-loans" label="Member loans" admin />
              <NavCard href="/equipment/admin/manage" label="Manage equipment" admin />
              <NavCard href="/equipment/admin/reserve" label="Reserve equipment" admin />
              <NavCard href="/equipment/admin/external" label="External loans" admin />
              <NavCard href="/equipment/admin/loan-history" label="Admin loan history" admin />
              <NavCard href="/equipment/admin/past-equipment" label="Past equipment" admin />
            </>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Events coverage</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <NavCard href="/events/add" label="Add event" />
          <NavCard href="/events/formal" label="Formal events" />
          <NavCard href="/events/my-events" label="My events" />
          <NavCard href="/events/my-hours" label="My hours" />
          {admin && (
            <>
              <NavCard href="/events/admin/formal" label="Formal events (admin)" admin />
              <NavCard href="/events/admin/coverage" label="Member events coverage" admin />
            </>
          )}
        </div>
      </section>

      {admin && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Club admin</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <NavCard href="/admin/members" label="View members" admin />
            <NavCard href="/admin/delete-data" label="Delete data" admin />
            <NavCard href="/admin/notifications" label="Email setup" admin />
            <NavCard href="/admin/export" label="Export to Excel" admin />
          </div>
        </section>
      )}
    </AppShell>
  );
}

function NavCard({
  href,
  label,
  admin,
}: {
  href: string;
  label: string;
  admin?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-zinc-200 bg-white px-4 py-4 font-medium shadow-sm transition hover:border-zinc-400 hover:shadow dark:border-zinc-700 dark:bg-zinc-900"
    >
      {label}
      {admin && (
        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
          Admin
        </span>
      )}
    </Link>
  );
}
