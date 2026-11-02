import { prisma } from "./prisma";

/**
 * The capability catalogue shared by the API guards and the admin UI. Keys are
 * stable; labels are shown in the permission matrix.
 */
export const PERMISSIONS = [
  { key: "overview.view", label: "View the dashboard overview", group: "Insights" },
  { key: "members.view", label: "View members and their activity", group: "People" },
  { key: "members.manage", label: "Create members, suspend and restore accounts", group: "People" },
  { key: "roles.manage", label: "Create roles and change permissions", group: "People" },
  { key: "audit.view", label: "Read the staff audit log", group: "People" },
  { key: "quiz.leaderboard", label: "Read leaderboard reports", group: "Quiz" },
  { key: "quiz.report", label: "Read per-question answer reports", group: "Quiz" },
  { key: "quiz.payments", label: "Review quiz retry payments", group: "Quiz" },
  { key: "quiz.prizes", label: "Manage the monthly prizes", group: "Quiz" },
  { key: "places.view", label: "View the places catalogue", group: "Places" },
  { key: "places.manage", label: "Add, edit and remove places", group: "Places" },
  { key: "content.moderate", label: "Hide shared travel stories", group: "Content" },
] as const;

export const PERMISSION_KEYS: string[] = PERMISSIONS.map((p) => p.key);

export interface RoleSeed {
  name: string;
  label: string;
  description: string;
  permissions: string[];
  builtIn: boolean;
}

const MODERATOR_PERMISSIONS = [
  "overview.view",
  "members.view",
  "members.manage",
  "quiz.leaderboard",
  "quiz.report",
  "quiz.payments",
  "places.view",
  "content.moderate",
];

/** Created on first boot; an existing row is left untouched so edits survive. */
export const DEFAULT_ROLES: RoleSeed[] = [
  {
    name: "ADMIN",
    label: "Administrator",
    description: "Full access to every staff surface and setting.",
    permissions: PERMISSION_KEYS,
    builtIn: true,
  },
  {
    name: "MODERATOR",
    label: "Moderator",
    description: "Member support, moderation, quiz reports and retry payments.",
    permissions: MODERATOR_PERMISSIONS,
    builtIn: true,
  },
  {
    name: "USER",
    label: "Member",
    description: "Regular player with no staff access.",
    permissions: [],
    builtIn: true,
  },
];

/** Permissions for a role name, falling back to the built-in defaults. */
export async function permissionsForRole(roleName: string): Promise<string[]> {
  if (!roleName) return [];
  const role = await prisma.role.findUnique({ where: { name: roleName }, select: { permissions: true } });
  if (role) return role.permissions;
  return DEFAULT_ROLES.find((r) => r.name === roleName)?.permissions ?? [];
}

export async function roleExists(roleName: string): Promise<boolean> {
  const role = await prisma.role.findUnique({ where: { name: roleName }, select: { id: true } });
  return Boolean(role);
}
