"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { Equipment } from "@/lib/types";

type CartKind = "member" | "external";

interface CartApi {
  items: Equipment[];
  addItem: (item: Equipment) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  hasItem: (id: string) => boolean;
}

interface CartContextValue {
  member: CartApi;
  external: CartApi;
}

const CartContext = createContext<CartContextValue | null>(null);

function useCartState(initial: Equipment[] = []) {
  const [items, setItems] = useState<Equipment[]>(initial);

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

  return useMemo(
    () => ({ items, addItem, removeItem, clear, hasItem }),
    [items, addItem, removeItem, clear, hasItem]
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const member = useCartState();
  const external = useCartState();

  const value = useMemo(() => ({ member, external }), [member, external]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function useCartByKind(kind: CartKind): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return kind === "member" ? ctx.member : ctx.external;
}

/** Personal / member equipment loan cart */
export function useMemberCart() {
  return useCartByKind("member");
}

/** External (non-member) loan cart — separate from member cart */
export function useExternalCart() {
  return useCartByKind("external");
}
