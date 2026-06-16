/*
 * UniDrop Marketplace - React Entry Point
 *
 * Renders the root App component into the DOM with:
 * - React.StrictMode for development best practices
 * - BrowserRouter for client-side routing
 * - AuthProvider for global authentication state
 * - AppErrorBoundary to catch and recover from unexpected errors
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import AppErrorBoundary from './components/AppErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </AppErrorBoundary>
);
