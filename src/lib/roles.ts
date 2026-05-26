import type { UserProfile, UserRole } from "./types";

export function hasRole(profile: UserProfile | null, role: UserRole): boolean {
  if (!profile) return false;
  return profile.roles.includes(role);
}

export function isQuartermaster(profile: UserProfile | null): boolean {
  return hasRole(profile, "quartermaster");
}

export function isArchivist(profile: UserProfile | null): boolean {
  return hasRole(profile, "archivist");
}

export function defaultRoles(): UserRole[] {
  return ["member"];
}
