import type { UserProfile, UserRole } from "./types";

const ADMIN_ROLES: UserRole[] = ["admin", "quartermaster", "archivist"];

export function hasRole(profile: UserProfile | null, role: UserRole): boolean {
  if (!profile) return false;
  return profile.roles.includes(role);
}

/** Staff with full admin access (equipment + events). */
export function isAdmin(profile: UserProfile | null): boolean {
  if (!profile) return false;
  return profile.roles.some((r) => ADMIN_ROLES.includes(r));
}

export function defaultRoles(): UserRole[] {
  return ["member"];
}
