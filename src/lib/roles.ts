import type { UserProfile, UserRole } from "./types";

/** Parse roles from Firestore (array or comma-separated string). */
export function normalizeRoles(roles: unknown): UserRole[] {
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

export function hasRole(profile: UserProfile | null, role: UserRole): boolean {
  if (!profile) return false;
  return profile.roles.includes(role);
}

/** Staff with full admin access (equipment + events). */
export function isAdmin(profile: UserProfile | null): boolean {
  if (!profile) return false;
  if (profile.isAdmin) return true;
  return profile.roles.some(
    (r) => r === "admin" || r === "quartermaster" || r === "archivist"
  );
}

export function defaultRoles(): UserRole[] {
  return ["member"];
}
