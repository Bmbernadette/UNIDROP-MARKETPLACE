/*
 * UniDrop Marketplace — Stripe Provider
 *
 * Wraps children with Stripe Elements context.
 * Uses the publishable key from environment / hardcoded for test mode.
 *
 * Handles load failures gracefully (shows error instead of infinite spinner).
 */

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Stripe test publishable key
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51TihUzRxeBeBnhMQsthKTXc9jf202cutQ6aHHIYmWh8aLSFpc23kmrfhAeTWQtXUOUuqV9XtU2XDIOiR4s73iEms00HQObLFHD';

let stripePromise = null;

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

const StripeProvider = ({ options, children }) => {
  const [stripe, setStripe] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getStripe()
      .then(s => {
        if (!cancelled) {
          if (s) {
            setStripe(s);
          } else {
            setLoadError('Stripe failed to initialize. Check your publishable key.');
          }
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('[Stripe] Load failed:', err);
          setLoadError('Could not connect to Stripe. Check your internet connection.');
        }
      });

    // Safety timeout: force show error after 12 seconds
    const safetyTimer = setTimeout(() => {
      if (!cancelled && !stripe) {
        setLoadError('Stripe is taking too long to load. Please refresh and try again.');
      }
    }, 12000);

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, []);

  if (loadError) {
    return (
      <div className="alert alert-error" style={{ flexDirection: 'column', textAlign: 'center', padding: 'var(--space-6)' }}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>Payment Unavailable</p>
        <p style={{ fontSize: '0.875rem', color: '#991B1B' }}>{loadError}</p>
      </div>
    );
  }

  if (!stripe) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading secure payment...</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripe} options={options}>
      {children}
    </Elements>
  );
};

export default StripeProvider;
export { STRIPE_PUBLISHABLE_KEY };
