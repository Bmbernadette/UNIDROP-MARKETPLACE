/*
 * UniDrop Marketplace — Error Boundary
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of a white screen.
 *
 * Handles:
 * - Render errors (null dereference, TDZ, undefined access)
 * - Lazy-load failures (chunk load errors)
 * - Event handler errors that cause re-render crashes
 */

import React, { Component } from 'react';

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[UniDrop] App crashed:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-8)',
          background: 'var(--color-gray-50)',
          fontFamily: 'var(--font-sans)',
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: 440,
            padding: 'var(--space-10)',
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--color-gray-200)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--color-error-light)', color: 'var(--color-error)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto var(--space-5)', fontSize: '1.5rem', fontWeight: 700,
            }}>
              !
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-gray-900)', marginBottom: 'var(--space-2)' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
              An unexpected error occurred. This is likely temporary — try reloading the page.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={this.handleReload} className="btn btn-primary">
                Reload Page
              </button>
              <button onClick={this.handleGoHome} className="btn btn-outline">
                Go Home
              </button>
            </div>
            {this.state.error && (
              <details style={{ marginTop: 'var(--space-6)', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-gray-400)' }}>
                  Error Details
                </summary>
                <pre style={{
                  marginTop: 'var(--space-2)', padding: 'var(--space-3)',
                  background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)',
                  fontSize: '0.75rem', color: 'var(--color-error)', overflow: 'auto',
                  maxHeight: 200, border: '1px solid var(--color-gray-200)',
                }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
