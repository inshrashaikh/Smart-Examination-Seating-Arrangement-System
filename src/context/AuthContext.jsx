import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService, clearStoredSession, API_ORIGIN, USE_MOCKS } from '../services';

/**
 * Session state.
 *
 * The backend is stateless: a successful login yields a JWT, and that token is
 * the only thing that survives a refresh. On mount we always re-validate with
 * `GET /auth/me`, because a token can be revoked, expired or simply belong to a
 * backend that was restarted with a new signing key.
 *
 * Exposes: `user`, `role`, `isAuthenticated`, `loading`, `login`, `logout`,
 * `refresh`, `homePath`.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.readUser());
  const [token, setToken] = useState(() => authService.readToken());
  // `true` until the one-time /auth/me probe settles — routes stay behind a
  // loader while this is true so we never flash /login at a signed-in user.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const applySession = useCallback((nextToken, nextUser) => {
    setToken(nextToken ?? null);
    setUser(nextUser ?? null);
    authService.saveSession({ token: nextToken, user: nextUser });
  }, []);

  const signOutLocally = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  /* ---------------------------- restore on refresh ---------------------------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const storedToken = authService.readToken();

      // No token: nothing to restore. Demo mode still needs a probe so the
      // stored mock user is trusted instead of discarded.
      if (!storedToken && !USE_MOCKS) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const me = await authService.getMe();
        if (cancelled) return;

        if (me && (me.id || me.email)) {
          // Live backend — the response is authoritative.
          applySession(me.token ?? storedToken, me);
          setError(null);
        } else if (storedToken) {
          // Demo mode: mockApi.me() returns null, so keep the cached user.
          // A real 401 would have thrown and cleared storage already.
          setUser((prev) => prev ?? authService.readUser());
        }
      } catch (err) {
        if (cancelled) return;
        // 401 interceptor already wiped storage; anything else is a transient
        // outage, which the NetworkBanner reports.
        if (err?.status !== 401) setError(err);
        signOutLocally();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applySession, signOutLocally]);

  /* ------------------------------- actions -------------------------------- */
  const login = useCallback(
    async ({ email, password, role }) => {
      setError(null);
      const result = await authService.login({ email, password, role });

      if (!result?.token) {
        const failure = { message: 'Login succeeded but no token was returned.', status: 0 };
        setError(failure);
        throw failure;
      }

      // The backend is the source of truth for the role. If the page asked for
      // a different one, refuse the session rather than silently switching
      // dashboards under the user.
      const actualRole = result.user?.role ?? result.role;
      if (role && actualRole && actualRole !== role) {
        const failure = {
          message: `Those credentials belong to a ${actualRole === 'ADMIN' ? 'department' : 'faculty'} account, not ${role === 'ADMIN' ? 'department' : 'faculty'}. Switch the role toggle and try again.`,
          status: 403,
          roleMismatch: { requested: role, actual: actualRole },
        };
        setError(failure);
        signOutLocally();
        throw failure;
      }

      applySession(result.token, result.user ?? null);
      return result;
    },
    [applySession, signOutLocally]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Stateless backend: a failed logout call must not trap the user in the app.
    } finally {
      signOutLocally();
    }
  }, [signOutLocally]);

  /** Re-reads the profile without touching the token. */
  const refresh = useCallback(async () => {
    try {
      const me = await authService.getMe();
      if (me && (me.id || me.email)) {
        setUser(me);
        authService.saveSession({ user: me });
        return me;
      }
      return user;
    } catch {
      return user;
    }
  }, [user]);

  /**
   * Saves profile edits via `PUT /auth/me` and re-persists the session.
   *
   * Returns the updated `UserResponse` so the calling form can reset its
   * dirty state from the server's copy rather than its own optimistic guess.
   */
  const updateProfile = useCallback(async (patch) => {
    const updated = await authService.updateProfile(patch);
    if (updated && (updated.id || updated.email)) {
      setUser(updated);
      authService.saveSession({ user: updated });
    }
    return updated;
  }, []);

  const role = user?.role ?? null;
  const isAuthenticated = Boolean(token && user);

  const value = useMemo(
    () => ({
      user,
      token,
      role,
      isAuthenticated,
      loading,
      error,
      login,
      logout,
      refresh,
      updateProfile,
      clearError: () => setError(null),
      homePath: role === 'FACULTY' ? '/faculty' : '/admin',
      isAdmin: role === 'ADMIN',
      isFaculty: role === 'FACULTY',
      apiOrigin: API_ORIGIN,
      demoMode: USE_MOCKS,
    }),
    [user, token, role, isAuthenticated, loading, error, login, logout, refresh, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Convenience wrapper that also asserts the provider is mounted. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;
