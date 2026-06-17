// ─────────────────────────────────────────────────────────────────────────────
// Central API configuration — the SINGLE source of truth for how the frontend
// talks to the backend. Change the base URL, timeout, or default headers here
// once and every request in the app picks it up.
//
// It is also runtime-configurable via `configureApi({...})` so the endpoint can
// be switched dynamically (e.g. point at a staging API from a dev menu) without
// touching call sites.
// ─────────────────────────────────────────────────────────────────────────────

export type ApiConfig = {
  /** Base URL prepended to every endpoint path. Same-origin "/api" by default. */
  baseUrl: string;
  /** Abort a request after this many ms (per-request override via options.timeoutMs). */
  defaultTimeoutMs: number;
  /** Headers sent on every request (merged with per-request headers). */
  defaultHeaders: Record<string, string>;
};

const config: ApiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "/api",
  defaultTimeoutMs: 30_000,
  defaultHeaders: {},
};

/** Read the current API configuration. */
export const getApiConfig = (): Readonly<ApiConfig> => config;

/**
 * Override API configuration at runtime. Useful for pointing the whole app at a
 * different endpoint dynamically.
 *   configureApi({ baseUrl: "https://staging.example.com/api" });
 */
export const configureApi = (overrides: Partial<ApiConfig>): Readonly<ApiConfig> => {
  Object.assign(config, overrides);
  if (overrides.defaultHeaders) {
    config.defaultHeaders = { ...config.defaultHeaders, ...overrides.defaultHeaders };
  }
  return config;
};
