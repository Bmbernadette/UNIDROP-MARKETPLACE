/*
 * UniDrop Marketplace — Checkout Page
 * Professional 5-step secure checkout flow with Stripe payment and escrow.
 *
 * Stripe Test Cards:
 *   Success:  4242 4242 4242 4242
 *   Decline:  4000 0000 0000 0002
 *   3D Secure: 4000 0000 0000 3220
 *   Any future date, any 3-digit CVC.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StripePaymentForm from '../components/StripePaymentForm';

const FEE_PCT = 3;

const CheckoutPage = () => {
  const { id: productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [order, setOrder] = useState(null);
  const [meetingPoint, setMeetingPoint] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/products/${productId}`);
        if (!cancelled) {
          setProduct(res.data.product);
          setMeetingPoint(res.data.product?.meeting_point || '');
        }
      } catch (err) {
        if (!cancelled) setError('Failed to load product details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  // Check for existing active order to resume the flow
  useEffect(() => {
    if (!product || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/orders/my-orders', { params: { type: 'buying', limit: 50 } });
        if (cancelled || !res.data?.orders) return;
        const existingOrder = res.data.orders.find(
          o => o.product_id === productId && ['pending', 'in_escrow'].includes(o.status)
        );
        if (existingOrder && !cancelled) {
          setOrder(existingOrder);
          if (existingOrder.status === 'in_escrow') {
            setStep(3);
            setSuccess('You have an active escrow for this item. Meet the seller and inspect!');
          } else if (existingOrder.status === 'pending') {
            setStep(2);
            setSuccess('You have a pending order for this item. Complete payment to secure it.');
          }
        }
      } catch (err) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [product, user, productId]);

  const priceNum = Number(product?.price) || 0;
  const fee = (priceNum * FEE_PCT) / 100;
  const total = priceNum + fee;

  const fmt = (a) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(Number(a) || 0).replace('TZS', 'TSh');

  const createOrder = async () => {
    try { setActionLoading(true); setError(null);
      const res = await api.post('/orders/create', { productId, meetingPoint: meetingPoint || product?.meeting_point });
      setOrder(res.data.order); setStep(2); setSuccess('Order created! Enter your card details to pay securely.');
    } catch (err) { setError(err.message || 'Failed to create order.');
    } finally { setActionLoading(false); }
  };

  // Called by StripePaymentForm on successful payment
  const handlePaymentSuccess = (paymentIntent) => {
    setStep(3);
    setSuccess('Payment confirmed! Funds held securely in escrow. Meet the seller to inspect the item.');
  };

  const handlePaymentError = (errMsg) => {
    setError(errMsg || 'Payment failed. Please try again.');
  };

  const approveRelease = async () => {
    try { setActionLoading(true); setError(null);
      await api.put(`/orders/${order.id}/approve`);
      setStep(5); setSuccess('Transaction complete! Funds released to seller.');
    } catch (err) { setError(err.message || 'Approval failed.');
    } finally { setActionLoading(false); }
  };

  const cancelOrder = async () => {
    if (!window.confirm('Cancel this order?')) return;
    try { setActionLoading(true); await api.put(`/orders/${order.id}/cancel`); navigate('/dashboard');
    } catch (err) { setError(err.message || 'Cancel failed.');
    } finally { setActionLoading(false); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner spinner-lg" /><p>Loading checkout...</p></div>;

  if (error && !product) return (
    <div className="container page-shell">
      <div className="alert alert-error">{error}</div>
      <Link to="/products" className="btn btn-outline" style={{ marginTop: 'var(--space-4)' }}>Browse Products</Link>
    </div>
  );

  if (!product) return (
    <div className="container page-shell">
      <div className="empty-state">
        <p className="empty-state-title">Product not found</p>
        <Link to="/products" className="btn btn-primary">Browse Products</Link>
      </div>
    </div>
  );

  const steps = [
    { num: 1, label: 'Confirm' },
    { num: 2, label: 'Pay' },
    { num: 3, label: 'Escrow' },
    { num: 4, label: 'Approve' },
    { num: 5, label: 'Done' },
  ];

  return (
    <div className="container page-shell" style={{ maxWidth: 640 }}>
      <Link to={`/products/${productId}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', color: 'var(--color-gray-500)', marginBottom: 'var(--space-6)' }}>
        <ArrowLeft size={16} /> Back to product
      </Link>

      <h1 className="page-title">Secure Checkout</h1>
      <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Shield size={16} style={{ color: 'var(--color-success)' }} />
        Payment secured by Stripe &amp; UniDrop Escrow System
      </p>

      {/* Steps indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: 'var(--space-10) 0 var(--space-8)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 14, left: '10%', right: '10%', height: 2, background: 'var(--color-gray-200)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 14, left: '10%', width: `${Math.min((step - 1) * 25, 80)}%`, height: 2, background: 'var(--color-primary)', zIndex: 1, transition: 'width 0.5s ease' }} />
        {steps.map((s) => {
          const done = step > s.num;
          const active = step === s.num;
          return (
            <div key={s.num} style={{ textAlign: 'center', flex: 1, zIndex: 2, fontSize: '0.75rem', fontWeight: active ? 600 : 400, color: done ? 'var(--color-primary)' : active ? 'var(--color-gray-900)' : 'var(--color-gray-400)' }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: done ? 'var(--color-primary)' : active ? 'var(--color-white)' : 'var(--color-gray-200)',
                border: active ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: done ? 'white' : active ? 'var(--color-primary)' : 'var(--color-gray-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 4px', fontWeight: 700, fontSize: '0.75rem',
                transition: 'all 0.3s ease',
              }}>
                {done ? <CheckCircle size={14} /> : s.num}
              </div>
              {s.label}
            </div>
          );
        })}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Order summary */}
      <div className="card card-static" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <h3 style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-gray-500)', marginBottom: 'var(--space-4)' }}>Order Summary</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ color: 'var(--color-gray-600)' }}>{product.title}</span><span style={{ fontWeight: 600 }}>{fmt(priceNum)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem', color: 'var(--color-gray-500)' }}><span>Commission Fee ({FEE_PCT}%)</span><span>{fmt(fee)}</span></div>
        <hr className="divider" style={{ margin: 'var(--space-3) 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}><span>Total</span><span style={{ color: 'var(--color-primary)' }}>{fmt(total)}</span></div>
      </div>

      {/* Step 1: Confirm Meeting Point */}
      {step === 1 && (
        <div className="card card-static" style={{ padding: 'var(--space-6)' }}>
          <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-4)' }}>Confirm Meeting Point</h3>
          <div style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)', border: '1px solid var(--color-gray-200)' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)' }}><strong>Seller:</strong> {product.seller_name} ({product.seller_university})</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)' }}><strong>Campus:</strong> {product.campus_location}</p>
          </div>
          <div className="form-group">
            <label className="form-label">Meeting Point on Campus</label>
            <input type="text" className="form-input" value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} placeholder="e.g., Main Library Entrance, Student Center" />
          </div>
          <button onClick={createOrder} disabled={actionLoading || !meetingPoint.trim()} className="btn btn-secondary btn-lg btn-block">
            {actionLoading ? 'Creating Order...' : 'Proceed to Payment'}
          </button>
        </div>
      )}

      {/* Step 2: Stripe Payment */}
      {step === 2 && order && (
        <div className="card card-static" style={{ padding: 'var(--space-6)' }}>
          <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Card Payment
          </h3>

          <StripePaymentForm
            orderId={order.id}
            amount={total}
            formatPrice={fmt}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />

          <button onClick={cancelOrder} className="btn btn-ghost btn-sm btn-block" style={{ color: 'var(--color-error)', marginTop: 'var(--space-4)' }}>
            <XCircle size={14} /> Cancel Order
          </button>
        </div>
      )}

      {/* Step 3: Funds in Escrow */}
      {step === 3 && (
        <div className="card card-static" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-success-light)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-5)' }}>
            <Shield size={32} strokeWidth={1.8} />
          </div>
          <h3 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: 6 }}>Funds Secured in Escrow</h3>
          <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-6)' }}>
            Your payment of <strong>{fmt(total)}</strong> has been processed by Stripe and is held securely.
            Meet the seller at <strong>{order.meeting_point}</strong> to inspect the item.
          </p>
          <div style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-6)', textAlign: 'left', border: '1px solid var(--color-gray-200)' }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>What happens next?</p>
            <ol style={{ paddingLeft: 20, color: 'var(--color-gray-700)', lineHeight: 2, fontSize: '0.875rem' }}>
              <li>Contact the seller to arrange a meeting time</li>
              <li>Go to the meeting point on campus</li>
              <li>Inspect the item thoroughly</li>
              <li>If satisfied, click "Approve Release" below</li>
              <li>Funds are instantly released to the seller</li>
            </ol>
          </div>
          <button onClick={approveRelease} disabled={actionLoading} className="btn btn-success btn-lg btn-block" style={{ marginBottom: 10 }}>
            {actionLoading ? 'Processing...' : 'Approve Release — I\'m Satisfied'}
          </button>
          <button onClick={cancelOrder} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }}>
            <XCircle size={14} /> Cancel &amp; Refund
          </button>
        </div>
      )}

      {/* Step 5: Complete */}
      {step === 5 && (
        <div className="card card-elevated" style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-success-light)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-5)' }}>
            <CheckCircle size={32} strokeWidth={1.8} />
          </div>
          <h3 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: 6, color: 'var(--color-success)' }}>Transaction Complete!</h3>
          <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-6)' }}>Funds have been released to the seller. Thank you for using UniDrop!</p>
          <Link to="/dashboard" className="btn btn-primary btn-lg">Go to Dashboard</Link>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
