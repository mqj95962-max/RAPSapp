"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { Equipment } from "@/lib/types";

interface CartContextValue {
  items: Equipment[];
  addItem: (item: Equipment) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  hasItem: (id: string) => boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Equipment[]>([]);

  const addItem = useCallback((item: Equipment) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const hasItem = useCallback(
    (id: string) => items.some((i) => i.id === id),
    [items]
  );

  const value = useMemo(
    () => ({ items, addItem, removeItem, clear, hasItem }),
    [items, addItem, removeItem, clear, hasItem]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
