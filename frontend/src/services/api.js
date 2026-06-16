/*
 * UniDrop Marketplace - API Service
 *
 * Centralized HTTP client for all backend API communication.
 * Uses Axios with interceptors for:
 * - Automatic JWT token attachment to requests
 * - Response error handling (no full-page redirects)
 *
 * Key fixes:
 * - NEVER uses window.location.href (prevents redirect loops)
 * - 403 does NOT clear auth or redirect (it's a permission issue, not auth)
 * - Only 401 clears token and dispatches a custom event for React Router navigation
 */

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('unidrop_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle errors without page reloads
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // 401 Unauthorized: token invalid/expired → clear auth state
      // Dispatch custom event instead of window.location.href to prevent full-page reload
      if (status === 401) {
        // Only fire once to prevent cascading clears
        if (!window._unidropAuthCleared) {
          window._unidropAuthCleared = true;
          localStorage.removeItem('unidrop_token');
          localStorage.removeItem('unidrop_user');
          window.dispatchEvent(new CustomEvent('unidrop:auth-expired'));
          // Reset guard after a short delay for next potential expiry
          setTimeout(() => { window._unidropAuthCleared = false; }, 1000);
        }
      }

      // 403 Forbidden: do NOT clear auth — user is authenticated but lacks permission
      // Just pass the error through

      return Promise.reject({
        status,
        message: data?.message || data?.error || 'An unexpected error occurred',
        errors: data?.errors || [],
      });
    }

    // Network error (no response from server)
    return Promise.reject({
      status: 0,
      message: 'Network error. Please check your connection.',
      errors: [],
    });
  }
);

export default api;
