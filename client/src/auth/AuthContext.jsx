import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { apiRequest, configureApiAuth } from '../api/client.js';

const TOKEN_STORAGE_KEY = 'clubflow.auth.token';

const AuthContext = createContext(null);

function readStoredToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // A browser with storage disabled can still sign in for this tab.
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readStoredToken);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(token ? 'loading' : 'anonymous');
  const [restoreError, setRestoreError] = useState(null);

  const tokenRef = useRef(token);
  const restoreAttempt = useRef(0);
  const initialRestoreStarted = useRef(false);

  const clearSession = useCallback(() => {
    // Invalidate any restore request that is still in flight so it cannot put
    // the user back into an authenticated state after the session was cleared.
    restoreAttempt.current += 1;
    tokenRef.current = null;
    storeToken(null);
    setToken(null);
    setUser(null);
    setStatus('anonymous');
    setRestoreError(null);
  }, []);

  useEffect(() => {
    configureApiAuth({
      getToken: () => tokenRef.current,
      onUnauthorized: clearSession,
    });
  }, [clearSession]);

  const restoreSession = useCallback(async () => {
    const currentToken = tokenRef.current;
    if (!currentToken) {
      setStatus('anonymous');
      return;
    }

    const attempt = restoreAttempt.current + 1;
    restoreAttempt.current = attempt;
    setStatus('loading');
    setRestoreError(null);

    try {
      const response = await apiRequest('/auth/me', {
        auth: true,
        handleUnauthorized: false,
      });

      if (restoreAttempt.current !== attempt) {
        return;
      }

      setUser(response.data);
      setStatus('authenticated');
    } catch (error) {
      if (restoreAttempt.current !== attempt) {
        return;
      }

      if (error.status === 401) {
        clearSession();
        return;
      }

      setStatus('error');
      setRestoreError(error.message || 'Không thể khôi phục phiên đăng nhập.');
    }
  }, [clearSession]);

  useEffect(() => {
    if (initialRestoreStarted.current) {
      return;
    }
    initialRestoreStarted.current = true;
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (email, password) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });

    const accessToken = response?.data?.accessToken;
    const nextUser = response?.data?.user;

    if (typeof accessToken !== 'string' || !accessToken || !nextUser || typeof nextUser !== 'object') {
      throw new Error('Phản hồi đăng nhập không có accessToken và user hợp lệ.');
    }

    tokenRef.current = accessToken;
    storeToken(accessToken);
    setToken(accessToken);
    setUser(nextUser);
    setStatus('authenticated');
    setRestoreError(null);

    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (tokenRef.current) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          handleUnauthorized: false,
        });
      }
    } catch {
      // The mock keeps stateless tokens. The local session is cleared even if
      // the logout request cannot reach the server, so the UI never stays stuck.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      token,
      status,
      restoreError,
      login,
      logout,
      retryRestore: restoreSession,
      clearSession,
    }),
    [user, token, status, restoreError, login, logout, restoreSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được dùng bên trong AuthProvider.');
  }
  return context;
}
