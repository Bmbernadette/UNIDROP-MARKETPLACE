/*
 * UniDrop Marketplace — 404 Not Found
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFoundPage = () => (
  <div className="container page-shell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
    <div style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--color-gray-200)', marginBottom: 'var(--space-4)', lineHeight: 1 }}>404</div>
    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8, color: 'var(--color-gray-900)' }}>Page Not Found</h1>
    <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--space-8)', maxWidth: 400 }}>
      The page you're looking for doesn't exist or has been moved.
    </p>
    <Link to="/" className="btn btn-primary btn-lg">
      <Home size={18} /> Return to Home
    </Link>
  </div>
);

export default NotFoundPage;
