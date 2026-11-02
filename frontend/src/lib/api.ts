import axios from "axios";

const rawOrigin = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
export const API_ORIGIN = rawOrigin.replace(/\/$/, "");

export const api = axios.create({
  baseURL: API_ORIGIN || undefined,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const entry = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

api.interceptors.request.use((config) => {
  const method = (config.method ?? "get").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = readCookie("ch_csrf");
    if (csrf) config.headers.set("x-csrf-token", csrf);
  }
  return config;
});

export function apiError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string } } | undefined;
    if (data?.error?.message) return data.error.message;
    if (error.code === "ERR_NETWORK") return "Cannot reach the server. Check your connection and try again.";
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
