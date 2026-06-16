/*
 * UniDrop Marketplace — Create Listing Page
 * Professional form with image upload preview.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Camera, X, AlertCircle, Upload, Tag } from 'lucide-react';
import api from '../services/api';

const CreateListingPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', price: '', categoryId: '',
    condition: 'like_new', campusLocation: '', meetingPoint: '',
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/categories').then(r => { if (!cancelled) setCategories(r.data.categories || []); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Cleanup object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => { previews.forEach(u => URL.revokeObjectURL(u)); };
  }, [previews]);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) { setError('Maximum 5 images allowed.'); return; }
    const invalid = files.filter(f => !['image/jpeg','image/jpg','image/png','image/webp'].includes(f.type));
    if (invalid.length) { setError('Only JPEG, PNG, and WebP images are allowed.'); return; }
    const big = files.filter(f => f.size > 5 * 1024 * 1024);
    if (big.length) { setError('Each image must be less than 5MB.'); return; }
    setImages(prev => [...prev, ...files]);
    setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    setError(null);
  };

  const removeImage = (i) => {
    setImages(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => { URL.revokeObjectURL(prev[i]); return prev.filter((_, idx) => idx !== i); });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(null);
    const required = ['title','description','price','categoryId','campusLocation','meetingPoint'];
    if (required.some(k => !form[k])) { setError('Please fill in all required fields.'); return; }
    if (parseFloat(form.price) < 0) { setError('Price must be positive.'); return; }
    try {
      setLoading(true);
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      images.forEach(img => fd.append('images', img));
      const res = await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      // Navigation triggers component unmount, which cleans up object URLs via useEffect
      navigate(`/products/${res.data.product.id}`);
    } catch (err) { setError(err.message || 'Failed to create listing.'); }
    finally { setLoading(false); }
  };

  const conditions = [
    { v: 'brand_new', l: 'Brand New — Never used, in original packaging' },
    { v: 'like_new', l: 'Like New — Used a few times, no visible wear' },
    { v: 'well_used', l: 'Well Used — Shows signs of wear but fully functional' },
  ];

  const campuses = ['UDSM','DIT','IFM','CBE','MUHAS','ARDHI','SUA'];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-10) var(--space-6)' }}>
      <div className="page-heading">
        <h1 className="page-title">Sell an Item</h1>
        <p className="page-subtitle">List your item for other students to discover</p>
      </div>

      {error && <div className="alert alert-error"><AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card card-static" style={{ padding: 'var(--space-8)' }}>
          <div className="form-group"><label className="form-label">Product Title *</label><input type="text" name="title" value={form.title} onChange={handleChange} className="form-input" placeholder="e.g., Dell Inspiron 15 Laptop, 8GB RAM" maxLength={255} /></div>

          <div className="form-group"><label className="form-label">Category *</label><select name="categoryId" value={form.categoryId} onChange={handleChange} className="form-select"><option value="">Select a category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>

          <div className="form-group"><label className="form-label">Price (TSh) *</label><input type="number" name="price" value={form.price} onChange={handleChange} className="form-input" placeholder="e.g., 350000" min="0" step="1000" /></div>

          <div className="form-group"><label className="form-label">Condition *</label><select name="condition" value={form.condition} onChange={handleChange} className="form-select">{conditions.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}</select></div>

          <div className="form-group"><label className="form-label">Description *</label><textarea name="description" value={form.description} onChange={handleChange} className="form-textarea" placeholder="Describe your item in detail: brand, model, specs, reason for selling, any flaws..." rows={5} /></div>

          <div className="form-group"><label className="form-label">Campus Location *</label><select name="campusLocation" value={form.campusLocation} onChange={handleChange} className="form-select"><option value="">Select your campus</option>{campuses.map(c => <option key={c} value={c}>{c}</option>)}</select></div>

          <div className="form-group"><label className="form-label">Meeting Point *</label><input type="text" name="meetingPoint" value={form.meetingPoint} onChange={handleChange} className="form-input" placeholder="e.g., Main Library Entrance, Student Center Cafe" /><p className="form-hint">Choose a safe, public location on campus for the exchange</p></div>

          {/* Images */}
          <div className="form-group">
            <label className="form-label">Photos (up to 5)</label>
            {previews.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                {previews.map((p, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={p} alt="" style={{ width: 90, height: 90, borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '1px solid var(--color-gray-200)' }} />
                    <button type="button" onClick={() => removeImage(i)} style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: 'var(--color-error)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', border: '2px solid white' }}><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            {images.length < 5 && (
              <div style={{ border: '2px dashed var(--color-gray-300)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', textAlign: 'center', cursor: 'pointer', transition: 'border-color var(--transition-base)' }}>
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple onChange={handleImages} style={{ display: 'none' }} id="img-upload" />
                <label htmlFor="img-upload" style={{ cursor: 'pointer', display: 'block' }}>
                  <Camera size={28} style={{ color: 'var(--color-gray-400)', margin: '0 auto var(--space-2)' }} />
                  <p style={{ fontWeight: 600, color: 'var(--color-gray-600)', fontSize: '0.9rem' }}>Click to add photos</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-400)' }}>{images.length}/5 photos added</p>
                </label>
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn btn-secondary btn-lg btn-block" style={{ marginTop: 'var(--space-4)' }}>
            <Package size={18} /> {loading ? 'Publishing...' : 'Publish Listing'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-gray-400)', marginTop: 'var(--space-4)' }}>
            By publishing, you agree to UniDrop's terms and 3% commission on successful sales.
          </p>
        </div>
      </form>
    </div>
  );
};

export default CreateListingPage;
