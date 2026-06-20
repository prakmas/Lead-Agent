// Public surface of the API layer. Import from "@/lib/api":
//   import { listingService, conversationService, endpoints, configureApi } from "@/lib/api";
//
// • config     — base URL & runtime configuration (configureApi)
// • client     — http.get/post/patch/del, request(), ApiError
// • endpoints  — central registry of every backend path
// • services   — typed, reusable domain services (the preferred call surface)
export * from "./config";
export * from "./client";
export * from "./endpoints";
export * from "./services";

// Backward-compatible alias for the old low-level helper `api(path, options)`.
// Prefer the typed services; this remains for any incremental call sites.
import { request, type RequestOptions } from "./client";
import { getApiConfig } from "./config";

export const api = <T>(path: string, options: RequestOptions = {}) => request<T>(path, options);

/** @deprecated read getApiConfig().baseUrl instead. */
export const apiUrl = getApiConfig().baseUrl;
