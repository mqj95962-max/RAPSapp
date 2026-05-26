"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/home" className="font-semibold tracking-tight">
              RAPS Club
            </Link>
            {title && (
              <span className="hidden text-sm text-zinc-500 sm:inline">
                / {title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            {profile && (
              <span className="hidden text-zinc-600 sm:inline">
                {profile.displayName || profile.email}
              </span>
            )}
            {pathname !== "/home" && (
              <Link
                href="/home"
                className="rounded-md px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Home
              </Link>
            )}
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-md px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
