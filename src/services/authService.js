import { api, callMock } from './api';
import { STORAGE_KEYS } from './config';
import * as mock from './mockApi';

/**
 * Authentication.
 *
 * The backend issues a stateless JWT: `POST /auth/login` returns
 * `{ token, tokenType, expiresIn, user, role }`. The token is the only thing
 * that survives a refresh — `GET /auth/me` rehydrates the user from it.
 */
export const authService = {
  /** @returns {{token:string, tokenType:string, expiresIn:number, user:object, role:string}} */
  login: (credentials) =>
    callMock(() => mock.authApi.login(credentials)) ??
    api.post(
      '/auth/login',
      {
        email: String(credentials?.email ?? '').trim(),
        password: credentials?.password ?? '',
        // Optional: the backend ignores it for authentication, but sending it
        // makes the "you picked the wrong role" failure mode observable.
        role: credentials?.role,
      },
      { skipErrorToast: true }
    ),

  /** Current user from the stored token. Throws 401 when the token is dead. */
  getMe: () => callMock(() => mock.authApi.me()) ?? api.get('/auth/me', { skipErrorToast: true }),

  /**
   * The backend is stateless so logout is purely a client concern; we still
   * notify it so an access log records the event.
   */
  logout: () => callMock(() => mock.authApi.logout()) ?? api.post('/auth/logout', null, { skipErrorToast: true }),

  register: (payload) => callMock(() => mock.authApi.login(payload)) ?? api.post('/auth/register', payload),

  /**
   * `PUT /auth/me` — partial profile update.
   *
   * Every field is optional server-side, but `email` is the account identity,
   * so a change to it can invalidate the current token and force a re-login.
   * The response is the updated `UserResponse`, which is what the caller should
   * write back into storage.
   */
  updateProfile: (payload) =>
    callMock(() => mock.authApi.me()) ?? api.put('/auth/me', payload),

  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),

  /* ------------------------------ storage ------------------------------ */
  saveSession({ token, user }) {
    try {
      if (token) localStorage.setItem(STORAGE_KEYS.token, token);
      if (user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    } catch {
      /* storage unavailable — the session simply will not persist */
    }
  },

  readToken() {
    try {
      return localStorage.getItem(STORAGE_KEYS.token);
    } catch {
      return null;
    }
  },

  readUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.user);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
};

export default authService;
