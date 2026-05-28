import type { Firestore } from "firebase-admin/firestore";

type UserRole = "member" | "admin" | "quartermaster" | "archivist";

function normalizeRoles(roles: unknown): UserRole[] {
  if (Array.isArray(roles)) {
    return roles.filter((r): r is UserRole => typeof r === "string");
  }
  if (typeof roles === "string" && roles.trim()) {
    return roles
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) as UserRole[];
  }
  return ["member"];
}

export function isStaffUser(data: FirebaseFirestore.DocumentData | undefined): boolean {
  if (!data) return false;
  if (data.isAdmin === true) return true;
  const roles = normalizeRoles(data.roles);
  return roles.some(
    (r) => r === "admin" || r === "quartermaster" || r === "archivist"
  );
}

export async function getStaffEmails(db: Firestore): Promise<string[]> {
  const snap = await db.collection("users").get();
  const emails = new Set<string>();
  for (const doc of snap.docs) {
    if (!isStaffUser(doc.data())) continue;
    const email = String(doc.data().email ?? "").trim();
    if (email) emails.add(email);
  }
  return [...emails];
}
