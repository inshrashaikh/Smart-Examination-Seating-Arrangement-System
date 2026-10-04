import axios from 'axios';
import toast from 'react-hot-toast';
import {
  API_BASE_URL,
  API_ORIGIN,
  STORAGE_KEYS,
  REQUEST_TIMEOUT_MS,
  USE_MOCKS,
} from './config';

/**
 * The one and only HTTP client.
 *
 * Responsibilities
 *  - attach `Authorization: Bearer <token>` from localStorage on every request
 *  - unwrap the backend's `ApiResponse<T>` envelope so callers receive `T`
 *  - normalise every failure into a plain `{ message, status, errors }` object
 *  - on 401: drop the stored session and bounce to /login
 *  - on any other failure: raise a react-hot-toast with the backend's own message
 *  - on a connection failure: raise it once and flip a flag the retry banner watches
 *
 * No other module may construct its own axios instance or hardcode a URL.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  // Bearer tokens, not cookies — but harmless to send credentials too.
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

/* ------------------------------------------------------------------ *
 * Cross-tab logout signal + network state, consumed by NetworkBanner.
 * Kept as plain callbacks so this module stays free of React imports
 * beyond the toast singleton.
 * ------------------------------------------------------------------ */
let networkDownHandler = null;
let networkUpHandler = null;

export function onNetworkDown(handler) {
  networkDownHandler = handler;
}
export function onNetworkUp(handler) {
  networkUpHandler = handler;
}

function announceNetworkDown() {
  networkDownHandler?.();
}
function announceNetworkUp() {
  networkUpHandler?.();
}

/** Test seam + used by the retry banner to probe liveness. */
export function isApiReachable() {
  return api.get('/health', { timeout: 4000 }).then(() => true).catch(() => false);
}

/* ------------------------------------------------------------------ *
 * Session teardown — shared by the 401 path and AuthContext.logout.
 * ------------------------------------------------------------------ */
export function clearStoredSession() {
  try {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
  } catch {
    /* private mode — nothing to clean */
  }
}

/**
 * Kicks the browser to /login exactly once.
 * The `sesa.redirected` guard stops a burst of parallel 401s (React StrictMode
 * fires effects twice) from stacking history entries.
 */
function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const { pathname, search } = window.location;
  if (pathname.startsWith('/login')) return;
  if (window.sessionStorage.getItem('sesa.redirected') === '1') return;
  window.sessionStorage.setItem('sesa.redirected', '1');
  window.location.assign(`/login?expired=1&from=${encodeURIComponent(pathname + search)}`);
}

/* ------------------------------------------------------------------ *
 * Request interceptor
 * ------------------------------------------------------------------ */
api.interceptors.request.use(
  (config) => {
    let token = null;
    try {
      token = localStorage.getItem(STORAGE_KEYS.token);
    } catch {
      token = null;
    }
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Blob downloads must not ask axios to parse JSON.
    if (config.responseType === 'blob') config.headers.Accept = '*/*';

    // Lets a page opt out of the automatic toast when it renders its own
    // (Students, Generate Seating, Reports all do).
    if (config.skipErrorToast) {
      config.headers['X-Silent-Errors'] = 'true';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ------------------------------------------------------------------ *
 * Response interceptor
 * ------------------------------------------------------------------ */

/**
 * The backend returns `{ status, message, data, timestamp, path, errors }`.
 * On 2xx we hand back `data`; on an error status inside a 200 envelope (the
 * backend does this for validation summaries) we treat it as a failure.
 */
function unwrapEnvelope(payload) {
  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    'status' in payload &&
    'data' in payload
  ) {
    if (Number(payload.status) >= 400) {
      return { failed: true, status: Number(payload.status), payload };
    }
    return { failed: false, value: payload.data };
  }
  return { failed: false, value: payload };
}

/** Pulls the human-readable message out of whatever shape came back. */
function messageFrom(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
  if (typeof payload.error === 'string' && payload.error.trim()) return payload.error;
  if (payload.detail && typeof payload.detail === 'string') return payload.detail;
  return fallback;
}

const NETWORK_MESSAGE = `Cannot reach the backend at ${API_ORIGIN}. Is it running?`;

api.interceptors.response.use(
  (response) => {
    // A successful response proves the backend is alive.
    announceNetworkUp();

    // Report downloads come back as raw bytes — never touch them.
    if (response.config.responseType === 'blob') return response;

    const result = unwrapEnvelope(response.data);
    if (result.failed) {
      const error = {
        message: messageFrom(result.payload, 'Request failed'),
        status: result.status,
        errors: result.payload?.errors ?? null,
        payload: result.payload,
      };
      if (!response.config.skipErrorToast) {
        toast.error(error.message, { id: 'api-error' });
      }
      return Promise.reject(error);
    }
    return result.value;
  },
  (error) => {
    const config = error?.config ?? {};
    const status = error?.response?.status ?? 0;

    /* ---------------- network down ---------------- */
    if (!error?.response) {
      announceNetworkDown();
      const normalised = {
        message: error?.code === 'ECONNABORTED' ? 'The request timed out.' : NETWORK_MESSAGE,
        status: 0,
        errors: null,
        isNetworkError: true,
      };
      // A timeout on a long-running generate is expected UX, not an outage —
      // and the retry banner is for a *down* server, so it is not raised here.
      if (!config.skipErrorToast && error?.code !== 'ECONNABORTED') {
        toast.error(normalised.message, { id: 'api-network' });
      }
      return Promise.reject(normalised);
    }

    announceNetworkUp();

    /* ---------------- 401: session is over ---------------- */
    if (status === 401) {
      clearStoredSession();
      if (!config.skipErrorToast) {
        toast.error('Your session has expired. Please sign in again.', { id: 'api-401' });
      }
      // The login call itself must not trigger a redirect loop.
      if (!String(config.url ?? '').includes('/auth/login')) redirectToLogin();
      return Promise.reject({
        message: messageFrom(error.response.data, 'Invalid email or password'),
        status,
        errors: error.response.data?.errors ?? null,
      });
    }

    /* ---------------- everything else ---------------- */
    const normalised = {
      message: messageFrom(error.response.data, error?.message || 'Something went wrong'),
      status,
      errors: error.response.data?.errors ?? null,
      payload: error.response.data,
    };
    if (!config.skipErrorToast) {
      toast.error(normalised.message, { id: 'api-error' });
    }
    return Promise.reject(normalised);
  }
);

/* ------------------------------------------------------------------ *
 * Mock helper — lets every service share one branch point.
 * ------------------------------------------------------------------ */
export function callMock(mockFn) {
  if (!USE_MOCKS) return null;
  return Promise.resolve()
    .then(() => mockFn())
    .catch((err) => {
      const normalised = { message: err?.message ?? 'Mock error', status: err?.status ?? 0, errors: null };
      toast.error(normalised.message, { id: 'api-mock-error' });
      throw normalised;
    });
}

export { API_BASE_URL, API_ORIGIN, USE_MOCKS, STORAGE_KEYS, api };
export default api;
