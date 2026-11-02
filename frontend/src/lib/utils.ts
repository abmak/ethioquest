import { clsx, type ClassValue } from "clsx";

export function cn(...values: ClassValue[]): string {
  return clsx(values);
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * The calendar days a leaderboard period covers, e.g. "1 Nov 2026" or
 * "26 Oct – 1 Nov 2026". Parsed as UTC days so the range never shifts by one
 * in a browser west of the server's timezone.
 */
export function formatDayRange(from: string, to: string): string {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const dayMonth: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "UTC" };
  const full: Intl.DateTimeFormatOptions = { ...dayMonth, year: "numeric" };
  if (from === to) return start.toLocaleDateString(undefined, full);
  if (start.getUTCFullYear() !== end.getUTCFullYear()) {
    return `${start.toLocaleDateString(undefined, full)} – ${end.toLocaleDateString(undefined, full)}`;
  }
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${start.toLocaleDateString(undefined, { day: "numeric", timeZone: "UTC" })} – ${end.toLocaleDateString(undefined, full)}`;
  }
  return `${start.toLocaleDateString(undefined, dayMonth)} – ${end.toLocaleDateString(undefined, full)}`;
}

export function timeAgo(value: string | Date): string {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function formatDuration(ms?: number | null): string {
  if (ms === null || ms === undefined) return "—";
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatEtb(amount: number): string {
  return `ETB ${amount.toLocaleString("en-US")}`;
}

export function budgetLabel(level: number): string {
  return level <= 1 ? "Budget" : level === 2 ? "Mid-range" : "Premium";
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
