/**
 * Single source of truth for runtime configuration.
 *
 * Every value is read from Vite's `import.meta.env`, which is statically
 * replaced at build time, so there is no `process` dependency and no runtime
 * config fetch. Nothing outside this file may read `import.meta.env`.
 *
 * See `.env.example` for the available variables.
 */

/** Base URL for every REST call. Falls back to the Vite proxy path. */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

/** Where the backend process lives — used for the proxy and error copy. */
export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:8080';

/**
 * Demo-mode switch.
 * `false` (default) -> every service hits the real Spring Boot API.
 * `true`            -> services short-circuit to `src/services/mockApi.js`.
 */
export const USE_MOCKS = String(import.meta.env.VITE_USE_MOCKS).toLowerCase() === 'true';

/** localStorage keys. Kept here so the interceptor and contexts cannot drift. */
export const STORAGE_KEYS = {
  token: 'sesa.token',
  user: 'sesa.user',
};

/** Milliseconds of silence before a search input triggers a request. */
export const SEARCH_DEBOUNCE_MS = 400;

/** Axios request timeout — the seating engine is the slowest legitimate call. */
export const REQUEST_TIMEOUT_MS = 30_000;

export default {
  API_BASE_URL,
  API_ORIGIN,
  USE_MOCKS,
  STORAGE_KEYS,
  SEARCH_DEBOUNCE_MS,
  REQUEST_TIMEOUT_MS,
};
