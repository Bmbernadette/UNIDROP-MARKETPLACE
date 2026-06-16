/*
 * UniDrop Marketplace — Verify Student Page
 * Professional student ID verification with lucide icons.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Upload, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const VerifyStudentPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('File must be less than 5MB.'); return; }
    setFile(f);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a file to upload.'); return; }
    try {
      setLoading(true); setError(null);
      const fd = new FormData(); fd.append('file', file);
      const upRes = await api.post('/upload/single', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.post('/auth/verify-student', { verificationDocumentUrl: upRes.data.file.url });
      setSuccess('Verification document submitted! Your student ID is pending review. This usually takes 1-2 business days.');
    } catch (err) { setError(err.message || 'Submission failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - var(--header-height))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: user?.isVerified ? 'var(--color-success-light)' : 'var(--color-primary-light)',
            color: user?.isVerified ? 'var(--color-success)' : 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-4)',
          }}>
            {user?.isVerified ? <CheckCircle size={32} strokeWidth={1.8} /> : <Shield size={32} strokeWidth={1.8} />}
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-gray-900)', letterSpacing: '-0.02em' }}>
            {user?.isVerified ? 'Student Verified' : 'Verify Student Identity'}
          </h1>
          <p style={{ color: 'var(--color-gray-500)', marginTop: 4, fontSize: '0.9375rem' }}>
            {user?.isVerified
              ? 'Your student ID has been verified. You can now trade with confidence!'
              : 'Upload your student ID to get verified and build trust with other students.'}
          </p>
        </div>

        <div className="card card-static" style={{ padding: 'var(--space-8)' }}>
          {error && <div className="alert alert-error"><AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {error}</div>}
          {success && <div className="alert alert-success"><CheckCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {success}</div>}

          {!user?.isVerified && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Upload Student ID Card</label>
                <div style={{
                  border: '2px dashed var(--color-gray-300)', borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-8)', textAlign: 'center', cursor: 'pointer',
                  transition: 'border-color var(--transition-base)',
                  background: file ? 'var(--color-gray-50)' : 'transparent',
                }}>
                  <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} id="verify-upload" />
                  <label htmlFor="verify-upload" style={{ cursor: 'pointer', display: 'block' }}>
                    {file ? (
                      <div>
                        <CheckCircle size={28} style={{ color: 'var(--color-success)', margin: '0 auto var(--space-2)' }} />
                        <p style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>{file.name}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <Upload size={28} style={{ color: 'var(--color-gray-400)', margin: '0 auto var(--space-2)' }} />
                        <p style={{ color: 'var(--color-gray-600)', fontWeight: 500 }}>Click to upload student ID photo</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-400)' }}>JPG, PNG, or WebP (max 5MB)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div style={{
                background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)', marginBottom: 'var(--space-6)',
                border: '1px solid var(--color-gray-200)',
              }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-gray-800)', marginBottom: 8 }}>Why verify?</p>
                <ul style={{ paddingLeft: 20, color: 'var(--color-gray-600)', lineHeight: 2, fontSize: '0.85rem' }}>
                  <li>Build trust with buyers and sellers</li>
                  <li>Get a "Verified" badge on your profile</li>
                  <li>Access to all trading features</li>
                  <li>Help keep UniDrop scam-free</li>
                </ul>
              </div>

              <button type="submit" disabled={loading || !file} className="btn btn-primary btn-lg btn-block">
                <Shield size={18} /> {loading ? 'Submitting...' : 'Submit for Verification'}
              </button>
            </form>
          )}

          <button onClick={() => navigate('/dashboard')} className="btn btn-outline btn-block" style={{ marginTop: 'var(--space-4)' }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyStudentPage;
