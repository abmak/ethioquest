import { create } from "zustand";
import { api } from "../lib/api";
import type { User } from "../types";

interface RegisterPayload {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

interface AuthState {
  user: User | null;
  status: "idle" | "loading" | "ready";
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: "idle",

  bootstrap: async () => {
    if (get().status !== "idle") return;
    set({ status: "loading" });
    try {
      const response = await api.get<{ user: User }>("/api/auth/me");
      set({ user: response.data.user, status: "ready" });
    } catch {
      set({ user: null, status: "ready" });
    }
  },

  login: async (email, password) => {
    const response = await api.post<{ user: User }>("/api/auth/login", { email, password });
    set({ user: response.data.user, status: "ready" });
    return response.data.user;
  },

  register: async (payload) => {
    const response = await api.post<{ user: User }>("/api/auth/register", payload);
    set({ user: response.data.user, status: "ready" });
    return response.data.user;
  },

  logout: async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      set({ user: null, status: "ready" });
    }
  },
}));
