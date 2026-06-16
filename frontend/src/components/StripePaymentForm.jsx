/*
 * UniDrop Marketplace — Stripe Payment Form
 *
 * Loads Stripe.js dynamically at runtime. Creates a <script> tag that
 * appends to the document head. Once loaded, mounts a Stripe card Element.
 *
 * Test Cards:
 *   4242 4242 4242 4242 (success)
 *   4000 0000 0000 0002 (decline)
 *   Any future date, any 3-digit CVC.
 */

import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Lock, AlertCircle } from 'lucide-react';
import api from '../services/api';

// Known working test publishable key
const FALLBACK_KEY = 'pk_test_51TihUzRxeBeBnhMQsthKTXc9jf202cutQ6aHHIYmWh8aLSFpc23kmrfhAeTWQtXUOUuqV9XtU2XDIOiR4s73iEms00HQObLFHD';

const StripePaymentForm = ({ orderId, amount, formatPrice, onPaymentSuccess, onPaymentError }) => {
  const stripeRef = useRef(null);
  const cardRef = useRef(null);
  const cardElementRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const [initError, setInitError] = useState(null);
  const [publishableKey, setPublishableKey] = useState(null);
  const mountedRef = useRef(true);

  // Step 1: Fetch publishable key from backend
  useEffect(() => {
    api.get('/payments/config')
      .then(res => {
        if (mountedRef.current) {
          setPublishableKey(res.data.publishableKey || FALLBACK_KEY);
        }
      })
      .catch(() => {
        if (mountedRef.current) setPublishableKey(FALLBACK_KEY);
      });
  }, []);

  // Step 2: Load Stripe.js dynamically once we have the key
  useEffect(() => {
    if (!publishableKey) return;

    console.log('[Stripe] Starting load with key:', publishableKey.substring(0, 20) + '...');
    console.log('[Stripe] window.Stripe exists:', !!window.Stripe);

    // If Stripe is already on window (cached from previous page), use it directly
    if (window.Stripe) {
      console.log('[Stripe] Using cached window.Stripe');
      setupStripe(window.Stripe);
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src="https://js.stripe.com/v3/"]');
    if (existingScript) {
      console.log('[Stripe] Found existing script tag, waiting for load...');
      const onLoad = () => {
        existingScript.removeEventListener('load', onLoad);
        console.log('[Stripe] Existing script loaded, window.Stripe:', !!window.Stripe);
        if (mountedRef.current && window.Stripe) setupStripe(window.Stripe);
        else if (mountedRef.current) setInitError('Stripe loaded but failed to initialize.');
      };
      if (existingScript.getAttribute('data-loaded') === 'true' && window.Stripe) {
        console.log('[Stripe] Already loaded, using directly');
        setupStripe(window.Stripe);
      } else {
        existingScript.addEventListener('load', onLoad);
      }
      return;
    }

    // Create fresh script tag
    console.log('[Stripe] Creating new script tag...');
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;

    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      console.log('[Stripe] Script loaded, window.Stripe:', !!window.Stripe);
      if (mountedRef.current && window.Stripe) {
        setupStripe(window.Stripe);
      } else if (mountedRef.current) {
        setInitError('Stripe loaded but failed to initialize.');
      }
    };

    script.onerror = (err) => {
      console.error('[Stripe] Script load error:', err);
      if (mountedRef.current) {
        setInitError('Could not connect to Stripe. Please check your internet connection.');
      }
    };

    document.head.appendChild(script);
    console.log('[Stripe] Script tag appended to head');
  }, [publishableKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (cardElementRef.current) {
        try { cardElementRef.current.unmount(); } catch (e) {}
      }
    };
  }, []);

  const setupStripe = (StripeConstructor) => {
    try {
      const stripe = StripeConstructor(publishableKey);
      if (!stripe) {
        if (mountedRef.current) setInitError('Invalid Stripe publishable key.');
        return;
      }

      stripeRef.current = stripe;
      const elements = stripe.elements();

      const card = elements.create('card', {
        style: {
          base: {
            fontSize: '15px',
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            color: '#1F2937',
            '::placeholder': { color: '#9CA3AF' },
          },
          invalid: { color: '#DC2626' },
        },
        hidePostalCode: true,
      });

      cardElementRef.current = card;

      // Mark ready first so the form with cardRef div renders
      setStripeReady(true);

      // Mount card element on next tick after DOM has the ref div
      setTimeout(() => {
        if (cardRef.current && mountedRef.current) {
          card.mount(cardRef.current);
          card.on('change', (event) => {
            setCardError(event.error ? event.error.message : null);
            setCardComplete(event.complete);
          });
        }
      }, 50);
    } catch (err) {
      console.error('[Stripe] Setup error:', err);
      if (mountedRef.current) setInitError('Failed to initialize payment form.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripeRef.current || !cardElementRef.current) return;
    if (!cardComplete) { setCardError('Please complete your card details.'); return; }

    setProcessing(true);
    setCardError(null);

    try {
      const { data } = await api.post('/payments/create-payment-intent', { orderId });
      const { clientSecret, paymentIntentId } = data;

      const { error: stripeError, paymentIntent } = await stripeRef.current.confirmCardPayment(
        clientSecret,
        { payment_method: { card: cardElementRef.current } }
      );

      if (stripeError) {
        setCardError(stripeError.message);
        setProcessing(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        await api.post('/payments/confirm-payment', { orderId, paymentIntentId: paymentIntent.id });
        if (onPaymentSuccess) onPaymentSuccess(paymentIntent);
      } else {
        setCardError(`Payment status: ${paymentIntent.status}. Please try again.`);
      }
    } catch (err) {
      setCardError(err.message || 'Payment failed.');
    } finally {
      setProcessing(false);
    }
  };

  // --- Error state ---
  if (initError) {
    return (
      <div style={{
        background: 'var(--color-error-light)', borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)', textAlign: 'center',
        border: '1px solid #FECACA',
      }}>
        <AlertCircle size={24} style={{ color: 'var(--color-error)', margin: '0 auto var(--space-2)' }} />
        <p style={{ fontWeight: 600, color: '#991B1B', marginBottom: 4 }}>Payment Unavailable</p>
        <p style={{ fontSize: '0.875rem', color: '#991B1B' }}>{initError}</p>
        <button onClick={() => window.location.reload()} className="btn btn-outline btn-sm" style={{ marginTop: 'var(--space-3)' }}>
          Refresh Page
        </button>
      </div>
    );
  }

  // --- Loading state ---
  if (!stripeReady) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading secure payment...</p>
      </div>
    );
  }

  // --- Form ---
  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)', marginBottom: 'var(--space-5)',
        border: '1px solid var(--color-gray-200)', textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', marginBottom: 4 }}>Amount to Pay</p>
        <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>
          {formatPrice ? formatPrice(amount) : `TSh ${Number(amount).toLocaleString()}`}
        </p>
      </div>

      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CreditCard size={15} /> Card Details
        </label>
        <div ref={cardRef} style={{
          padding: '14px 16px',
          border: cardError ? '1px solid var(--color-error)' : '1px solid var(--color-gray-300)',
          borderRadius: 'var(--radius-md)', background: 'var(--color-white)',
          transition: 'border-color var(--transition-base), box-shadow var(--transition-base)',
          minHeight: 40,
        }} />
        {cardError && (
          <p style={{ color: 'var(--color-error)', fontSize: '0.8125rem', marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={14} /> {cardError}
          </p>
        )}
      </div>

      <div style={{
        background: 'var(--color-info-light)', borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)', marginBottom: 'var(--space-5)',
        border: '1px solid #BFDBFE', fontSize: '0.8rem', color: '#1E40AF', lineHeight: 1.6,
      }}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>Test Mode — Stripe Test Cards</p>
        <p><strong>Success:</strong> 4242 4242 4242 4242</p>
        <p style={{ fontSize: '0.75rem', marginTop: 4 }}>Any future expiry &middot; Any 3-digit CVC</p>
      </div>

      <button type="submit" disabled={!cardComplete || processing}
        className="btn btn-secondary btn-lg btn-block"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {processing ? (
          <><div className="spinner spinner-sm" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} /> Processing...</>
        ) : (
          <><Lock size={18} /> Pay {formatPrice ? formatPrice(amount) : `TSh ${Number(amount).toLocaleString()}`}</>
        )}
      </button>
    </form>
  );
};

export default StripePaymentForm;
