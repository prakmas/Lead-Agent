import { clearSession, getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5055/api";

type RequestOptions = RequestInit & {
  auth?: boolean;
};

export const api = async <T>(path: string, options: RequestOptions = {}) => {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // Expired or invalid token — clear session and redirect to login.
  if (response.status === 401 && options.auth !== false) {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Session expired. Please log in again.");
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(typeof body === "string" ? body : body.message || "Request failed");
  }

  return body as T;
};

export const apiUrl = API_URL;
