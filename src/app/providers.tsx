"use client";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ServerTimeProvider } from "@/context/ServerTimeContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ServerTimeProvider>
        <CartProvider>{children}</CartProvider>
      </ServerTimeProvider>
    </AuthProvider>
  );
}
