"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function AdminGuard({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "quartermaster" | "archivist";
}) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const allowed = profile?.roles.includes(role);

  useEffect(() => {
    if (!loading && profile && !allowed) {
      router.replace("/home");
    }
  }, [loading, profile, allowed, router]);

  if (loading || !allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">
        {loading ? "Loading…" : "Access denied"}
      </div>
    );
  }

  return <>{children}</>;
}
