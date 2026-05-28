import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { isStaffUser } from "./staff";

export async function verifyIdToken(
  adminAuth: Auth,
  token: string
): Promise<string> {
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

export async function requireStaff(
  db: Firestore,
  uid: string
): Promise<void> {
  const snap = await db.collection("users").doc(uid).get();
  if (!isStaffUser(snap.data())) {
    throw new Error("Admin access required.");
  }
}

export function getBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
