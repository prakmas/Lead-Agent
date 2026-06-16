import type { AdminUser } from "@/types/api";

const TOKEN_KEY = "crr_admin_token";
const ADMIN_KEY = "crr_admin_user";

export const getToken = () =>
  typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);

export const saveSession = (token: string, admin: AdminUser) => {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
};

export const getAdmin = (): AdminUser | null => {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(ADMIN_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearSession = () => {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_KEY);
};
