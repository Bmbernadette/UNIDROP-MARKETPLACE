/*
 * UniDrop Marketplace — Product Catalog
 * Professional filter sidebar + product grid with debounced search.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

const ProductCatalogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const init = (k) => searchParams.get(k) || '';
  const [filters, setFilters] = useState({
    search: init('search'), campus: init('campus'), category: init('category'),
    condition: init('condition'), minPrice: init('minPrice'), maxPrice: init('maxPrice'),
    sortBy: init('sortBy') || 'newest', page: parseInt(init('page'), 10) || 1,
  });

  // Debounce filter changes (400ms) to prevent flood of API calls while typing
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const debounceTimer = useRef(null);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value, page: key === 'page' ? value : 1 };
      // Clear previous timer and set new debounce
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => setDebouncedFilters(next), 400);
      return next;
    });
  }, []);

  // Immediately update debounce on mount (no delay needed)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedFilters(filters), 100);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, []);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const campuses = ['UDSM', 'DIT', 'IFM', 'CBE', 'MUHAS', 'ARDHI', 'SUA'];
  const conditions = [
    { v: 'brand_new', l: 'Brand New' },
    { v: 'like_new', l: 'Like New' },
    { v: 'well_used', l: 'Well Used' },
  ];
  const sortOpts = [
    { v: 'newest', l: 'Newest First' },
    { v: 'price_asc', l: 'Price: Low to High' },
    { v: 'price_desc', l: 'Price: High to Low' },
    { v: 'popular', l: 'Most Popular' },
  ];

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.categories || [])).catch(() => {});
  }, []);

  // Fetch products only when debounced filters change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const params = new URLSearchParams();
        Object.entries(debouncedFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
        const res = await api.get(`/products?${params.toString()}`);
        if (!cancelled) {
          setProducts(res.data.products || []);
          setPagination(res.data.pagination || { page: 1, total: 0, totalPages: 1 });
          setSearchParams(params);
        }
      } catch (err) {
        if (!cancelled) setError('Failed to load products.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedFilters, setSearchParams]);

  const goPage = (p) => { updateFilter('page', p); window.scrollTo(0, 0); };

  const sidebar = (
    <div className="card card-static" style={{ padding: 'var(--space-6)', position: 'sticky', top: 'calc(var(--header-height) + var(--space-6))' }}>
      <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <SlidersHorizontal size={18} /> Filters
      </h3>

      <div className="form-group">
        <label className="form-label">Search</label>
        <input type="text" className="form-input" placeholder="Search items..." value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Campus</label>
        <select className="form-select" value={filters.campus} onChange={(e) => updateFilter('campus', e.target.value)}>
          <option value="">All Campuses</option>
          {campuses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Category</label>
        <select className="form-select" value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Condition</label>
        <select className="form-select" value={filters.condition} onChange={(e) => updateFilter('condition', e.target.value)}>
          <option value="">Any Condition</option>
          {conditions.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Price Range (TSh)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" className="form-input" placeholder="Min" value={filters.minPrice} onChange={(e) => updateFilter('minPrice', e.target.value)} />
          <input type="number" className="form-input" placeholder="Max" value={filters.maxPrice} onChange={(e) => updateFilter('maxPrice', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Sort By</label>
        <select className="form-select" value={filters.sortBy} onChange={(e) => updateFilter('sortBy', e.target.value)}>
          {sortOpts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </div>
      <button onClick={() => {
        const reset = { search:'',campus:'',category:'',condition:'',minPrice:'',maxPrice:'',sortBy:'newest',page:1 };
        setFilters(reset);
        // Immediately update debounced without delay for reset
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => setDebouncedFilters(reset), 100);
      }} className="btn btn-outline btn-sm btn-block">
        Reset Filters
      </button>
    </div>
  );

  return (
    <div className="container page-shell">
      <div className="page-heading">
        <h1 className="page-title">Browse Products</h1>
        <p className="page-subtitle">
          {pagination.total > 0 ? `${pagination.total} item${pagination.total > 1 ? 's' : ''} available` : 'Discover items from verified students across campuses'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 'var(--space-8)', alignItems: 'start' }}>
        <aside className="hide-mobile">{sidebar}</aside>

        <div className="show-mobile" style={{ marginBottom: 'var(--space-4)', display: 'none' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={16} /> {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          {showFilters && <div style={{ marginTop: 'var(--space-4)' }}>{sidebar}</div>}
        </div>

        <div>
          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="loading-screen"><div className="spinner spinner-lg" /><p>Loading products...</p></div>
          ) : products.length > 0 ? (
            <>
              <div className="product-grid product-grid-3">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>

              {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 'var(--space-10)' }}>
                  <button onClick={() => goPage(pagination.page - 1)} disabled={pagination.page <= 1} className="btn btn-outline btn-sm">
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => goPage(p)}
                      className={`btn btn-sm ${p === pagination.page ? 'btn-primary' : 'btn-outline'}`}
                    >{p}</button>
                  ))}
                  <button onClick={() => goPage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="btn btn-outline btn-sm">
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><Filter size={48} strokeWidth={1.5} /></div>
              <p className="empty-state-title">No products found</p>
              <p className="empty-state-text">Try adjusting your filters or search terms.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) { .hide-mobile { display: none !important; } .show-mobile { display: block !important; } }
      `}</style>
    </div>
  );
};

export default ProductCatalogPage;
