/*
 * UniDrop Marketplace — Dashboard
 * Professional user dashboard with stats cards, orders, and listings tabs.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, DollarSign, Plus, Trash2, Clock, CheckCircle, XCircle, ShieldAlert, EyeOff } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Inline SVG for CreditCard icon (defined OUTSIDE component to avoid TDZ)
const CreditCardIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const STATUS_CFG = {
  pending:   { badge: 'badge-orange', icon: Clock,        label: 'Pending' },
  paid:      { badge: 'badge-blue',   icon: CreditCardIcon, label: 'Paid' },
  in_escrow: { badge: 'badge-blue',   icon: ShieldAlert,   label: 'In Escrow' },
  completed: { badge: 'badge-green',  icon: CheckCircle,   label: 'Completed' },
  cancelled: { badge: 'badge-red',    icon: XCircle,       label: 'Cancelled' },
  disputed:  { badge: 'badge-red',    icon: ShieldAlert,   label: 'Disputed' },
  available: { badge: 'badge-green',  icon: CheckCircle,   label: 'Available' },
  reserved:  { badge: 'badge-orange', icon: Clock,         label: 'Reserved' },
  sold:      { badge: 'badge-gray',   icon: ShoppingBag,   label: 'Sold' },
  hidden:    { badge: 'badge-gray',   icon: EyeOff,        label: 'Hidden' },
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('listings');
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { setLoading(true); const res = await api.get('/users/dashboard'); if (!cancelled) setData(res.data); }
      catch (err) { if (!cancelled) setError('Failed to load dashboard.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const fmt = (a) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(Number(a) || 0).replace('TZS', 'TSh');
  const fdate = (d) => new Date(d).toLocaleDateString('en-TZ', { year: 'numeric', month: 'short', day: 'numeric' });

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    try { await api.delete(`/products/${id}`); const r = await api.get('/users/dashboard'); setData(r.data); setActionError(null); }
    catch (err) { setActionError(err.message || 'Failed to delete listing.'); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this order?')) return;
    try { await api.put(`/orders/${id}/cancel`); const r = await api.get('/users/dashboard'); setData(r.data); setActionError(null); }
    catch (err) { setActionError(err.message || 'Failed to cancel order.'); }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this item? Funds will be released to the seller.')) return;
    try { await api.put(`/orders/${id}/approve`); const r = await api.get('/users/dashboard'); setData(r.data); setActionError(null); }
    catch (err) { setActionError(err.message || 'Failed to approve order.'); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner spinner-lg" /><p>Loading dashboard...</p></div>;

  const tabs = [
    { key: 'listings', label: 'My Listings', count: data?.myListings?.length || 0 },
    { key: 'buying', label: 'My Purchases', count: data?.recentOrders?.filter(o => o.buyer_id === user?.id).length || 0 },
    { key: 'selling', label: 'My Sales', count: data?.recentOrders?.filter(o => o.seller_id === user?.id).length || 0 },
  ];

  return (
    <div className="container page-shell">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.fullName}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/create-listing" className="btn btn-primary"><Plus size={17} /> New Listing</Link>
          {!user?.isVerified && <Link to="/verify-student" className="btn btn-outline">Verify Student ID</Link>}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <StatCard icon={Package} value={data?.stats?.activeListings || 0} label="Active Listings" color="var(--color-primary)" bg="var(--color-primary-light)" />
        <StatCard icon={ShoppingBag} value={data?.stats?.activeOrders || 0} label="Active Orders" color="#B45309" bg="var(--color-secondary-light)" />
        <StatCard icon={DollarSign} value={data?.stats?.soldItems || 0} label="Items Sold" color="var(--color-success)" bg="var(--color-success-light)" />
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {actionError && <div className="alert alert-error">{actionError}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-gray-200)', marginBottom: 'var(--space-6)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: 'var(--space-3) var(--space-5)', fontWeight: 600, fontSize: '0.875rem',
              color: tab === t.key ? 'var(--color-primary)' : 'var(--color-gray-500)',
              borderBottom: tab === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
              transition: 'all var(--transition-base)',
            }}>
            {t.label} <span style={{ color: 'var(--color-gray-400)', fontWeight: 400 }}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'listings' && <ListingsTab listings={data?.myListings || []} fmt={fmt} fdate={fdate} onDelete={handleDelete} />}
      {tab === 'buying' && <OrdersTab orders={(data?.recentOrders || []).filter(o => o.buyer_id === user?.id)} fmt={fmt} fdate={fdate} onCancel={handleCancel} onApprove={handleApprove} role="buyer" />}
      {tab === 'selling' && <OrdersTab orders={(data?.recentOrders || []).filter(o => o.seller_id === user?.id)} fmt={fmt} fdate={fdate} onCancel={handleCancel} role="seller" />}
    </div>
  );
};

/* ---- Sub-components ---- */

const StatCard = ({ icon: Icon, value, label, color, bg }) => (
  <div className="card card-static" style={{ padding: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={22} strokeWidth={1.8} />
    </div>
    <div>
      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-gray-900)', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{label}</p>
    </div>
  </div>
);

const ListingsTab = ({ listings, fmt, fdate, onDelete }) => {
  if (!listings.length) return <EmptyState icon={Package} title="No listings yet" text="Start selling items to other students on campus." linkTo="/create-listing" linkLabel="Create Your First Listing" />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {listings.map(l => {
        const s = STATUS_CFG[l.status] || STATUS_CFG.available;
        const StatusIcon = s.icon;
        return (
          <div key={l.id} className="card card-static" style={{ padding: 'var(--space-4) var(--space-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {l.primary_image ? <img src={l.primary_image} alt="" style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} /> : <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'var(--color-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray-300)' }}><Package size={24} /></div>}
                <div>
                  <Link to={`/products/${l.id}`} style={{ fontWeight: 600, color: 'var(--color-gray-900)', fontSize: '0.9375rem' }}>{l.title}</Link>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{fmt(l.price)} &middot; {l.category_name} &middot; {fdate(l.created_at)}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`badge ${s.badge}`}><StatusIcon size={12} /> {s.label}</span>
                {l.status === 'available' && <button onClick={() => onDelete(l.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }}><Trash2 size={15} /></button>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const OrdersTab = ({ orders, fmt, fdate, onCancel, onApprove, role }) => {
  if (!orders.length) return <EmptyState icon={ShoppingBag} title={role === 'buyer' ? 'No purchases yet' : 'No sales yet'} text={role === 'buyer' ? 'Browse products to find great deals.' : 'Create a listing to start selling.'} linkTo={role === 'buyer' ? '/products' : '/create-listing'} linkLabel={role === 'buyer' ? 'Browse Products' : 'Create a Listing'} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {orders.map(o => {
        const s = STATUS_CFG[o.status] || STATUS_CFG.pending;
        const StatusIcon = s.icon;
        return (
          <div key={o.id} className="card card-static" style={{ padding: 'var(--space-4) var(--space-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {o.product_image ? <img src={o.product_image} alt="" style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} /> : <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'var(--color-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray-300)' }}><Package size={24} /></div>}
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-gray-900)' }}>{o.product_title}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>
                    {role === 'buyer' ? 'Sold by' : 'Bought by'} {o.other_party_name} &middot; {fdate(o.created_at)}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.9375rem' }}>{fmt(o.amount)}</span>
                <span className={`badge ${s.badge}`}><StatusIcon size={12} /> {s.label}</span>
              </div>
            </div>
            {['pending', 'paid'].includes(o.status) && (
              <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 8 }}>
                <button onClick={() => onCancel(o.id)} className="btn btn-outline btn-sm" style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}><XCircle size={14} /> Cancel</button>
              </div>
            )}
            {o.status === 'in_escrow' && (
              <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link to={`/checkout/${o.product_id}`} className="btn btn-outline btn-sm">View Details</Link>
                <button onClick={() => onApprove(o.id)} className="btn btn-success btn-sm">Approve Release</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const EmptyState = ({ icon: Icon, title, text, linkTo, linkLabel }) => (
  <div className="empty-state">
    <div className="empty-state-icon"><Icon size={40} strokeWidth={1.5} /></div>
    <p className="empty-state-title">{title}</p>
    <p className="empty-state-text">{text}</p>
    {linkTo && <Link to={linkTo} className="btn btn-primary"><Plus size={16} /> {linkLabel}</Link>}
  </div>
);

export default DashboardPage;
