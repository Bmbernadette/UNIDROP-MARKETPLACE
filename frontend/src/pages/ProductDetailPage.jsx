/*
 * UniDrop Marketplace — Product Detail Page
 * Professional product detail with gallery, seller card, escrow info.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Shield, ChevronRight, Camera, Package } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [otherListings, setOtherListings] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const res = await api.get(`/products/${id}`);
        if (!cancelled) {
          setProduct(res.data.product);
          setImages(res.data.images || []);
          setOtherListings(res.data.otherListings || []);
        }
      } catch (err) {
        if (!cancelled) setError('Product not found or has been removed.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const formatPrice = (a) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(Number(a) || 0).replace('TZS', 'TSh');

  const conditionMap = {
    brand_new: 'Brand New', like_new: 'Like New', well_used: 'Well Used',
  };

  const handleBuy = () => {
    if (!isAuthenticated) { navigate('/login', { state: { from: `/products/${id}` } }); return; }
    navigate(`/checkout/${id}`);
  };

  if (loading) return <div className="loading-screen"><div className="spinner spinner-lg" /><p>Loading product details...</p></div>;

  if (error || !product) return (
    <div className="container page-shell">
      <div className="empty-state">
        <div className="empty-state-icon"><Package size={48} strokeWidth={1.5} /></div>
        <p className="empty-state-title">{error || 'Product not found'}</p>
        <Link to="/products" className="btn btn-primary">Browse Products</Link>
      </div>
    </div>
  );

  // Determine if main image URL is valid
  const mainImageUrl = images.length > 0 && images[selectedImage]?.image_url;
  const hasValidImage = !!mainImageUrl;

  return (
    <div className="container page-shell">
      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link to="/">Home</Link> <ChevronRight size={14} />
        <Link to="/products">Products</Link> <ChevronRight size={14} />
        <span style={{ color: 'var(--color-gray-400)' }}>{product.title}</span>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)', marginBottom: 'var(--space-12)' }}>
        {/* Gallery */}
        <div>
          <div style={{ background: 'var(--color-gray-100)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', height: 440, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-gray-200)' }}>
            {hasValidImage ? (
              <img src={mainImageUrl} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ color: 'var(--color-gray-300)' }}><Camera size={64} strokeWidth={1.5} /></div>
            )}
          </div>
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-3)', overflowX: 'auto' }}>
              {images.map((img, i) => (
                <button key={img.id || i} onClick={() => setSelectedImage(i)} style={{
                  width: 72, height: 72, borderRadius: 'var(--radius-md)', overflow: 'hidden',
                  border: i === selectedImage ? '2px solid var(--color-primary)' : '2px solid transparent',
                  cursor: 'pointer', flexShrink: 0, background: 'var(--color-gray-100)',
                  transition: 'border var(--transition-base)',
                }}>
                  {img?.image_url ? (
                    <img src={img.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray-300)' }}><Camera size={20} /></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-4)' }}>
            <span className="badge badge-blue">{conditionMap[product.condition] || 'Unknown'}</span>
            {product.is_premium && <span className="badge badge-amber">Featured</span>}
            <span className="badge badge-gray">{product.category_name}</span>
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-gray-900)', marginBottom: 'var(--space-2)', letterSpacing: '-0.02em' }}>
            {product.title}
          </h1>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 'var(--space-6)' }}>
            {formatPrice(product.price)}
          </p>

          <div style={{ marginBottom: 'var(--space-8)' }}>
            <h3 style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-gray-500)', marginBottom: 'var(--space-2)' }}>Description</h3>
            <p style={{ color: 'var(--color-gray-600)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{product.description}</p>
          </div>

          <div style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-6)', border: '1px solid var(--color-gray-200)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <MapPin size={16} style={{ color: 'var(--color-gray-600)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-gray-800)' }}>{product.campus_location}</span>
            </div>
            {product.meeting_point && (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)', paddingLeft: 24 }}>
                Meeting point: {product.meeting_point}
              </p>
            )}
          </div>

          <button onClick={handleBuy} disabled={product.seller_id === user?.id} className="btn btn-secondary btn-lg btn-block" style={{ marginBottom: 'var(--space-3)' }}>
            {product.seller_id === user?.id ? 'This is your listing' : 'Buy Now / Reserve'}
          </button>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', textAlign: 'center' }}>
            <Shield size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Payment secured by UniDrop Escrow System
          </p>
        </div>
      </div>

      {/* Seller + Escrow cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)', marginBottom: 'var(--space-12)' }}>
        <div className="card card-static" style={{ padding: 'var(--space-6)' }}>
          <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-4)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-gray-500)' }}>Seller Information</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
              {product.seller_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>
                {product.seller_name}
                {product.seller_verified && <span className="badge badge-green" style={{ marginLeft: 8, fontSize: '0.7rem' }}>Verified</span>}
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{product.seller_university}</p>
            </div>
          </div>
        </div>

        <div className="card card-static" style={{ padding: 'var(--space-6)', background: 'var(--color-secondary-light)', borderColor: 'rgba(232,168,23,0.2)' }}>
          <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-3)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#92400E' }}>Safe Transaction</h3>
          <ol style={{ paddingLeft: 20, color: 'var(--color-gray-700)', lineHeight: 2, fontSize: '0.875rem' }}>
            <li>Click "Buy Now" and complete payment</li>
            <li>Funds are held securely in Escrow</li>
            <li>Meet the seller at the campus meeting point</li>
            <li>Inspect the item in person</li>
            <li>Approve release &mdash; seller gets paid</li>
          </ol>
        </div>
      </div>

      {/* Other Listings */}
      {otherListings.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--color-gray-900)' }}>More from this Seller</h2>
          <div className="product-grid product-grid-4">
            {otherListings.map(item => <ProductCard key={item.id} product={item} />)}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailPage;
