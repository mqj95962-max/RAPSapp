"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function SignInPage() {
  const { user, loading, signInWithGoogle, initError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/home");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-zinc-950 px-4 text-white">
      <div className="w-full max-w-md text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">RAPS Club</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Photography Club Portal
        </h1>
        <p className="mt-3 text-zinc-400">
          Equipment loans, inventory management, and event coverage tracking in one place.
        </p>
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="mt-8 w-full rounded-xl bg-white px-6 py-3 font-medium text-zinc-900 shadow-lg hover:bg-zinc-100"
        >
          Sign in with Google
        </button>
        {initError && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-left text-sm text-red-100">
            <p className="font-semibold">Firebase not ready</p>
            <p className="mt-1">{initError}</p>
          </div>
        )}
        <p className="mt-6 text-xs text-zinc-500">
          New accounts default to member. Promote staff to admin in Firebase (Firestore users document).
        </p>
      </div>
    </div>
  );
}
