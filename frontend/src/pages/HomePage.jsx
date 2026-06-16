/*
 * UniDrop Marketplace — HomePage
 * Modern SaaS landing: hero, search, categories, featured, trust section.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Shield, Users, Sparkles,
  BookOpen, Monitor, Armchair, ChefHat,
  PencilRuler, Shirt, Dumbbell, Wrench, Box,
} from 'lucide-react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

const HomePage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('');
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  const campuses = ['UDSM', 'DIT', 'IFM', 'CBE', 'MUHAS', 'ARDHI', 'SUA'];

  const categoryIcons = {
    'textbooks-notes': BookOpen,
    electronics: Monitor,
    'furniture-dorm': Armchair,
    'kitchen-appliances': ChefHat,
    'drawing-art-tools': PencilRuler,
    'clothing-accessories': Shirt,
    'sports-fitness': Dumbbell,
    services: Wrench,
    other: Box,
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setDataError(null);
        const [fRes, cRes, nRes] = await Promise.all([
          api.get('/products/featured'),
          api.get('/categories'),
          api.get('/products?sortBy=newest&limit=8'),
        ]);
        if (!cancelled) {
          setFeatured(fRes.data.products || []);
          setCategories(cRes.data.categories || []);
          setNewProducts(nRes.data.products || []);
        }
      } catch (err) {
        console.error('Failed to load homepage data:', err);
        if (!cancelled) setDataError('Could not load marketplace data. Please try refreshing the page.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (searchQuery.trim()) p.set('search', searchQuery.trim());
    if (selectedCampus) p.set('campus', selectedCampus);
    navigate(`/products?${p.toString()}`);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <p>Loading UniDrop Marketplace...</p>
      </div>
    );
  }

  // Hero styles
  const heroStyle = {
    background: 'linear-gradient(160deg, #1A3A5C 0%, #2B7BD6 50%, #1A3A5C 100%)',
    padding: 'var(--space-20) 0 var(--space-16)',
    textAlign: 'center',
    color: 'white',
  };

  const trustBar = {
    display: 'flex', justifyContent: 'center', gap: 'var(--space-12)',
    marginTop: 'var(--space-12)', flexWrap: 'wrap',
    fontSize: '0.9rem', opacity: 0.8,
  };

  return (
    <div>
      {/* Hero Section */}
      <section style={heroStyle}>
        <div className="container">
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.25rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 'var(--space-4)' }}>
            Campus Trade Made<br />Safe and Easy
          </h1>
          <p style={{ fontSize: '1.125rem', opacity: 0.85, maxWidth: 560, margin: '0 auto var(--space-10)', lineHeight: 1.6 }}>
            The verified marketplace for university students in Tanzania.
            Buy and sell with confidence using our Digital Escrow System.
          </p>

          <form onSubmit={handleSearch} style={{
            maxWidth: 680, margin: '0 auto', background: 'var(--color-white)',
            borderRadius: 'var(--radius-2xl)', padding: 6,
            display: 'flex', flexWrap: 'wrap', gap: 6,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }}>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="What are you looking for? (textbooks, laptop, mattress...)"
              style={{ flex: '1 1 200px', padding: '14px 18px', border: 'none', borderRadius: 'var(--radius-xl)', fontSize: '1rem', outline: 'none', color: 'var(--color-gray-900)', minWidth: 180 }}
              aria-label="Search products" />
            <select value={selectedCampus} onChange={(e) => setSelectedCampus(e.target.value)}
              style={{ padding: '14px 18px', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-xl)', fontSize: '0.9rem', outline: 'none', background: 'var(--color-white)', minWidth: 130 }}>
              <option value="">All Campuses</option>
              {campuses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="submit" className="btn btn-secondary btn-lg" style={{ borderRadius: 'var(--radius-xl)' }}>
              <Search size={18} /> Search
            </button>
          </form>

          <div style={trustBar}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Shield size={17} /> Escrow Protected</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Users size={17} /> Verified Students</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><MapPin size={17} /> Campus Pickup</span>
          </div>
        </div>
      </section>

      <div className="container">
        {/* Data error banner */}
        {dataError && (
          <div className="alert alert-warning" style={{ marginTop: 'var(--space-6)' }}>
            {dataError}
            <button onClick={() => window.location.reload()} className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }}>Retry</button>
          </div>
        )}

        {/* Categories */}
        <section className="section">
          <div className="page-heading">
            <h2 className="page-title">Browse by Category</h2>
            <p className="page-subtitle">Find exactly what you need for campus life</p>
          </div>
          <div className="product-grid product-grid-3">
            {categories.map(cat => {
              const Icon = categoryIcons[cat.slug] || Box;
              return (
                <Link key={cat.id} to={`/products?category=${cat.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card card-static" style={{ padding: 'var(--space-8) var(--space-6)', textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-xl)', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
                      <Icon size={26} strokeWidth={1.8} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-gray-900)', marginBottom: 4 }}>{cat.name}</h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{cat.product_count || 0} items</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Featured */}
        {featured.length > 0 && (
          <section className="section-sm">
            <div className="page-heading">
              <h2 className="page-title">
                <Sparkles size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, color: 'var(--color-secondary)' }} />
                Featured Listings
              </h2>
              <p className="page-subtitle">Premium items from verified students</p>
            </div>
            <div className="product-grid product-grid-4">
              {featured.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* Newly Listed */}
        <section className="section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
            <div>
              <h2 className="page-title" style={{ marginBottom: 0 }}>Newly Listed</h2>
              <p className="page-subtitle">Latest items added by students</p>
            </div>
            <Link to="/products" className="btn btn-outline">View All</Link>
          </div>
          {newProducts.length > 0 ? (
            <div className="product-grid product-grid-4">
              {newProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><Box size={48} strokeWidth={1.5} /></div>
              <p className="empty-state-title">No listings yet</p>
              <p className="empty-state-text">Be the first to sell an item on UniDrop!</p>
              <Link to="/create-listing" className="btn btn-primary"><Sparkles size={16} /> Create a Listing</Link>
            </div>
          )}
        </section>

        {/* Trust Section */}
        <section style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-2xl)', padding: 'var(--space-12) var(--space-10)', marginBottom: 'var(--space-16)', border: '1px solid var(--color-gray-200)' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-gray-900)', marginBottom: 'var(--space-10)', letterSpacing: '-0.02em' }}>Why Choose UniDrop?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-8)', textAlign: 'center' }}>
            {[
              { Icon: Shield, color: 'var(--color-primary)', bg: 'var(--color-primary-light)', title: 'Verified Students', desc: 'Every user is a verified student with a valid institutional ID.' },
              { Icon: ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>, color: 'var(--color-secondary-hover)', bg: 'var(--color-secondary-light)', title: 'Escrow Protection', desc: 'Funds held securely until you inspect and approve the item in person.' },
              { Icon: MapPin, color: 'var(--color-success)', bg: 'var(--color-success-light)', title: 'Campus Pickup', desc: 'Meet on campus. No delivery fees. No long-distance travel.' },
            ].map(({ Icon, color, bg, title, desc }) => (
              <div key={title}>
                <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-xl)', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
                  <Icon size={26} />
                </div>
                <h3 style={{ fontWeight: 600, marginBottom: 4, fontSize: '1rem' }}>{title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
