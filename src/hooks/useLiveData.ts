"use client";

import { useEffect, useMemo, useState } from "react";
import {
  subscribeAllLoans,
  subscribeAllUsers,
  subscribeCategories,
  subscribeEquipment,
} from "@/lib/firestore";
import type { Category, Equipment, Loan, UserProfile } from "@/lib/types";

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

export function useAllUsersLive() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeAllUsers(
      (items) => {
        setUsers(items);
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

  return { users, loading, error };
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
