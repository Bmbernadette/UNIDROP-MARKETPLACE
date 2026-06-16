/*
 * UniDrop Marketplace — Register Page
 * Professional student registration form with lucide icons.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, Phone, GraduationCap, IdCard, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '',
    confirmPassword: '', university: '', studentId: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const universities = [
    'UDSM - University of Dar es Salaam',
    'DIT - Dar es Salaam Institute of Technology',
    'IFM - Institute of Finance Management',
    'CBE - College of Business Education',
    'MUHAS - Muhimbili University',
    'ARDHI - Ardhi University',
    'SUA - Sokoine University of Agriculture',
  ];

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(null);
    const required = ['fullName','email','phone','password','university','studentId'];
    if (required.some(k => !form[k])) { setError('Please fill in all required fields.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    try { setLoading(true); const { confirmPassword, ...data } = form; await register(data); navigate('/dashboard', { replace: true }); }
    catch (err) { setError(err.message || 'Registration failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - var(--header-height))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <img src="/logo.png" alt="UniDrop" style={{ width: 52, height: 52, objectFit: 'contain', margin: '0 auto var(--space-4)' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-gray-900)', letterSpacing: '-0.02em' }}>Join UniDrop</h1>
          <p style={{ color: 'var(--color-gray-500)', marginTop: 4, fontSize: '0.9375rem' }}>Create your student account to start trading</p>
        </div>

        <div className="card card-static" style={{ padding: 'var(--space-8)' }}>
          {error && <div className="alert alert-error"><AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <div style={{ position: 'relative' }}>
                <UserPlus size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', pointerEvents: 'none' }} />
                <input type="text" name="fullName" value={form.fullName} onChange={handleChange} className="form-input" placeholder="John Doe" style={{ paddingLeft: 42 }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', pointerEvents: 'none' }} />
                <input type="email" name="email" value={form.email} onChange={handleChange} className="form-input" placeholder="student@university.ac.tz" style={{ paddingLeft: 42 }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', pointerEvents: 'none' }} />
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="form-input" placeholder="+255 7XX XXX XXX" style={{ paddingLeft: 42 }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">University *</label>
              <div style={{ position: 'relative' }}>
                <GraduationCap size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', pointerEvents: 'none', zIndex: 1 }} />
                <select name="university" value={form.university} onChange={handleChange} className="form-select" style={{ paddingLeft: 42 }}>
                  <option value="">Select your university</option>
                  {universities.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Student ID / Registration Number *</label>
              <div style={{ position: 'relative' }}>
                <IdCard size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', pointerEvents: 'none' }} />
                <input type="text" name="studentId" value={form.studentId} onChange={handleChange} className="form-input" placeholder="e.g., 2024-04-XXXXX" style={{ paddingLeft: 42 }} />
              </div>
              <p className="form-hint">Required for student verification</p>
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', pointerEvents: 'none' }} />
                <input type="password" name="password" value={form.password} onChange={handleChange} className="form-input" placeholder="At least 6 characters" autoComplete="new-password" style={{ paddingLeft: 42 }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', pointerEvents: 'none' }} />
                <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} className="form-input" placeholder="Re-enter your password" autoComplete="new-password" style={{ paddingLeft: 42 }} />
              </div>
              {form.password && form.confirmPassword && form.password !== form.confirmPassword && <p className="form-error-text">Passwords do not match</p>}
            </div>

            <button type="submit" disabled={loading} className="btn btn-secondary btn-lg btn-block" style={{ marginTop: 'var(--space-2)' }}>
              <UserPlus size={18} /> {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
            Already have an account? <Link to="/login" style={{ fontWeight: 600 }}>Sign In</Link>
          </p>
        </div>

        <div style={{ marginTop: 'var(--space-5)', padding: 'var(--space-4)', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-lg)', fontSize: '0.8rem', color: 'var(--color-primary-hover)', textAlign: 'center', border: '1px solid rgba(43,123,214,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Shield size={14} /> Your information is secure. We verify all student IDs.
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
