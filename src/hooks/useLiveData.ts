"use client";

import { useEffect, useMemo, useState } from "react";
import {
  subscribeAllLoans,
  subscribeCategories,
  subscribeEquipment,
} from "@/lib/firestore";
import type { Category, Equipment, Loan } from "@/lib/types";

export function useEquipmentLive(includeDeleted = false) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeEquipment(
      (items) => {
        setEquipment(items);
        setLoading(false);
        setError(null);
      },
      {
        includeDeleted,
        onError: (err) => {
          setError(err.message);
          setLoading(false);
        },
      }
    );
    return () => unsub();
  }, [includeDeleted]);

  return { equipment, loading, error };
}

export function useCategoriesLive() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeCategories(
      (items) => {
        setCategories(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { categories, loading, error };
}

export function useAllLoansLive() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeAllLoans(
      (items) => {
        setLoans(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { loans, loading, error };
}

/** User loans derived from live all-loans stream (no extra index required). */
export function useUserLoansLive(userId: string | undefined) {
  const { loans: allLoans, loading, error } = useAllLoansLive();
  const loans = useMemo(
    () => (userId ? allLoans.filter((l) => l.userId === userId) : []),
    [allLoans, userId]
  );
  return { loans, loading, error };
}

export function LiveSyncBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
      Could not sync with the database: {error}. Check your connection and Firestore rules.
    </p>
  );
}
