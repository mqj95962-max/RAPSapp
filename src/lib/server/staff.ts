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

/** Extra staff inboxes from Vercel (comma-separated), always notified. */
function envStaffEmails(): string[] {
  const raw = process.env.NOTIFY_STAFF_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export async function getStaffEmails(db: Firestore): Promise<string[]> {
  const emails = new Set<string>(envStaffEmails());
  const snap = await db.collection("users").get();
  for (const doc of snap.docs) {
    if (!isStaffUser(doc.data())) continue;
    const email = String(doc.data().email ?? "").trim();
    if (email) emails.add(email);
  }
  return [...emails];
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local) return "***";
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}***@${domain}`;
}
