import { clearSession, getToken } from "../auth";
import { getApiConfig } from "./config";

// ─────────────────────────────────────────────────────────────────────────────
// HTTP client — the ONE place that performs fetch. Adds auth, JSON handling,
// query-string building, timeouts and consistent error handling. Everything else
// (services, endpoints) builds on top of the `http` helpers below.
// ─────────────────────────────────────────────────────────────────────────────

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export type RequestOptions = Omit<RequestInit, "body"> & {
  /** Attach the bearer token (default true). Set false for public endpoints. */
  auth?: boolean;
  /** Body — plain objects are JSON-stringified automatically; FormData/strings pass through. */
  body?: unknown;
  /** Appended as a query string, skipping undefined/null values. */
  query?: QueryParams;
  /** Per-request timeout override (ms). */
  timeoutMs?: number;
};

/** A fetch error carrying the HTTP status and parsed response body. */
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const buildUrl = (path: string, query?: QueryParams) => {
  const { baseUrl } = getApiConfig();
  const url = `${baseUrl}${path}`;
  if (!query) return url;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  }
  const search = qs.toString();
  return search ? `${url}${url.includes("?") ? "&" : "?"}${search}` : url;
};

/** Core request. Prefer the typed services or the `http` helpers over calling this directly. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth, body, query, timeoutMs, headers: headerInit, ...rest } = options;
  const cfg = getApiConfig();
  const headers = new Headers({ ...cfg.defaultHeaders });
  new Headers(headerInit).forEach((value, key) => headers.set(key, value));

  // Body: stringify plain objects, pass FormData/strings through untouched.
  let payload: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (body instanceof FormData || typeof body === "string") {
      payload = body as BodyInit;
      // Our string bodies are always JSON; set the header unless already present.
      if (typeof body === "string" && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
    } else {
      payload = JSON.stringify(body);
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    }
  }

  if (auth !== false) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs ?? cfg.defaultTimeoutMs);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      headers,
      body: payload,
      signal: rest.signal ?? controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out. Please try again.", 0);
    }
    throw new ApiError((err as Error).message || "Network error", 0);
  }
  clearTimeout(timer);

  // Expired/invalid token — clear session and bounce to login.
  if (response.status === 401 && auth !== false) {
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "string" ? data : (data as { message?: string })?.message || "Request failed";
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

/** Method-oriented helpers. Used by the typed services in `services.ts`. */
export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  del: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "DELETE" }),
};
