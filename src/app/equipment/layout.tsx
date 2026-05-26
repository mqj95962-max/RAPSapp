"use client";

import { AuthGuard } from "@/components/AuthGuard";

export default function EquipmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
