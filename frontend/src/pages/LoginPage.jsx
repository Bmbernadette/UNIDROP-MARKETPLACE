/*
 * UniDrop Marketplace — Login Page
 * Modern SaaS authentication form.
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const from = location.state?.from || '/';

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }
    try { setLoading(true); setError(null); await login(form.email, form.password); navigate(from, { replace: true }); }
    catch (err) { setError(err.message || 'Invalid credentials.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - var(--header-height))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <img src="/logo.png" alt="UniDrop" style={{ width: 52, height: 52, objectFit: 'contain', margin: '0 auto var(--space-4)' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-gray-900)', letterSpacing: '-0.02em' }}>Welcome Back</h1>
          <p style={{ color: 'var(--color-gray-500)', marginTop: 4, fontSize: '0.9375rem' }}>Sign in to your UniDrop account</p>
        </div>

        <div className="card card-static" style={{ padding: 'var(--space-8)' }}>
          {error && <div className="alert alert-error"><AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', pointerEvents: 'none' }} />
                <input id="email" type="email" name="email" value={form.email} onChange={handleChange} className="form-input" placeholder="student@university.ac.tz" autoComplete="email" style={{ paddingLeft: 42 }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', pointerEvents: 'none' }} />
                <input id="password" type="password" name="password" value={form.password} onChange={handleChange} className="form-input" placeholder="Enter your password" autoComplete="current-password" style={{ paddingLeft: 42 }} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block" style={{ marginTop: 'var(--space-2)' }}>
              <LogIn size={18} /> {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
            Don&apos;t have an account? <Link to="/register" style={{ fontWeight: 600 }}>Create Account</Link>
          </p>
        </div>

        <div style={{ marginTop: 'var(--space-5)', padding: 'var(--space-4)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', fontSize: '0.8rem', color: 'var(--color-gray-500)', textAlign: 'center', border: '1px solid var(--color-gray-200)' }}>
          <p>Demo: admin@unidrop.co.tz / admin123</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
