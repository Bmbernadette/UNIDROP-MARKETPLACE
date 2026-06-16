/*
 * UniDrop Marketplace — Stripe Payment Configuration
 *
 * Initializes the Stripe SDK with the secret key from environment.
 * Provides utility functions for payment processing.
 *
 * TEST MODE: Uses sk_test_ keys. All transactions are simulated.
 * Test cards: https://docs.stripe.com/testing
 */

const Stripe = require('stripe');

// Initialize Stripe with the secret key (test mode by default)
// apiVersion omitted — uses account default (2026-05-27.dahlia per Stripe CLI)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Format amount from TSh to Stripe's smallest unit (cents equivalent).
 * Stripe expects amounts in the smallest currency unit.
 * For TZS (Tanzanian Shilling), the smallest unit is 1 (no decimal).
 * We pass the amount directly since TSh has no fractional subunit.
 */
const toStripeAmount = (amountInTsh) => Math.round(Number(amountInTsh));

/**
 * Create a PaymentIntent for an order.
 * The amount is held but not captured — manual capture is used for escrow.
 *
 * @param {object} params
 * @param {number} params.amount - Amount in TSh
 * @param {string} params.orderId - UniDrop order UUID
 * @param {string} params.description - Product description
 * @returns {Promise<object>} Stripe PaymentIntent object
 */
const createPaymentIntent = async ({ amount, orderId, description, metadata = {} }) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: toStripeAmount(amount),
    currency: 'tzs',
    // capture_method: 'manual' enables escrow — funds are authorized but not captured
    // Use 'automatic' for simple flows, 'manual' for escrow
    capture_method: 'automatic',
    description,
    metadata: {
      orderId,
      platform: 'unidrop-marketplace',
      ...metadata,
    },
  });

  return paymentIntent;
};

/**
 * Capture a PaymentIntent (release escrow funds to seller).
 * Only works when capture_method is 'manual'.
 *
 * @param {string} paymentIntentId - Stripe PaymentIntent ID
 * @returns {Promise<object>} Updated PaymentIntent
 */
const capturePaymentIntent = async (paymentIntentId) => {
  const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
  return paymentIntent;
};

/**
 * Cancel / refund a PaymentIntent (return funds to buyer).
 *
 * @param {string} paymentIntentId - Stripe PaymentIntent ID
 * @returns {Promise<object>} Canceled PaymentIntent
 */
const cancelPaymentIntent = async (paymentIntentId) => {
  const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
  return paymentIntent;
};

/**
 * Verify a Stripe webhook signature.
 *
 * @param {string} payload - Raw request body (as string)
 * @param {string} signature - Stripe-Signature header
 * @returns {object} Verified event object
 */
const verifyWebhook = (payload, signature) => {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
};

module.exports = {
  stripe,
  toStripeAmount,
  createPaymentIntent,
  capturePaymentIntent,
  cancelPaymentIntent,
  verifyWebhook,
};
