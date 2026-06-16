/*
 * UniDrop Marketplace - Authentication Context
 *
 * Provides global authentication state to all components.
 *
 * Key fixes:
 * - User state initialized from localStorage (no loading gap)
 * - Abort controller for cleanup on StrictMode double-mount
 * - Safety timeout: forces loading=false after 8s even if API hangs
 * - Listens for custom 'unidrop:auth-expired' event for clean logout
 * - No race conditions on token validation
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Initialize user from localStorage immediately (no loading gap)
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('unidrop_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('unidrop_token'));
  const [loading, setLoading] = useState(true);

  // Validate existing token on mount (with abort + safety timeout)
  useEffect(() => {
    const abortController = new AbortController();
    let cancelled = false;

    // Safety timeout: force loading=false after 8 seconds
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    const initAuth = async () => {
      const savedToken = localStorage.getItem('unidrop_token');
      const savedUser = localStorage.getItem('unidrop_user');

      if (savedToken && savedUser) {
        try {
          const response = await api.get('/auth/me', {
            signal: abortController.signal,
          });
          if (!cancelled) {
            setUser(response.data.user);
            setToken(savedToken);
          }
        } catch (error) {
          // If request was aborted (StrictMode unmount), do nothing
          if (cancelled || abortController.signal.aborted) return;
          // Token invalid: clear auth state
          localStorage.removeItem('unidrop_token');
          localStorage.removeItem('unidrop_user');
          if (!cancelled) {
            setToken(null);
            setUser(null);
          }
        }
      }

      if (!cancelled) {
        setLoading(false);
        clearTimeout(safetyTimer);
      }
    };

    initAuth();

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      abortController.abort();
    };
  }, []);

  // Listen for auth-expired events from the API interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('unidrop:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('unidrop:auth-expired', handleAuthExpired);
  }, []);

  // Login
  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = response.data;

    localStorage.setItem('unidrop_token', newToken);
    localStorage.setItem('unidrop_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);

    return userData;
  }, []);

  // Register
  const register = useCallback(async (userData) => {
    const response = await api.post('/auth/register', userData);
    const { token: newToken, user: newUser } = response.data;

    localStorage.setItem('unidrop_token', newToken);
    localStorage.setItem('unidrop_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);

    return newUser;
  }, []);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem('unidrop_token');
    localStorage.removeItem('unidrop_user');
    setToken(null);
    setUser(null);
  }, []);

  // Check role
  const hasRole = useCallback((role) => user?.role === role, [user]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for consuming auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
