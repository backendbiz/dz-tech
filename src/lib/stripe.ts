import Stripe from 'stripe'

// ============================================
// Stripe Instance Management
// ============================================

// Cache for Stripe instances by secret key
const stripeInstances = new Map<string, Stripe>()

// Default instance using environment variable
let defaultStripeInstance: Stripe | null = null

/**
 * Get the default Stripe instance using STRIPE_SECRET_KEY env var
 */
export function getStripe(): Stripe {
  if (!defaultStripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }

    defaultStripeInstance = createStripeInstance(secretKey)
  }

  return defaultStripeInstance
}

/**
 * Get a Stripe instance for a specific secret key
 * Uses caching to avoid creating multiple instances for the same key
 */
export function getStripeForService(secretKey: string): Stripe {
  // Check cache first
  let instance = stripeInstances.get(secretKey)

  if (!instance) {
    instance = createStripeInstance(secretKey)
    stripeInstances.set(secretKey, instance)
  }

  return instance
}

/**
 * Create a new Stripe instance with consistent configuration
 */
function createStripeInstance(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    // Use a consistent API version across the app
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiVersion: '2024-12-18.acacia' as any,
    // Retry configuration
    maxNetworkRetries: 2,
    // Timeout in milliseconds
    timeout: 10000,
    // App info for Stripe Dashboard analytics
    appInfo: {
      name: 'DZTech Consulting',
      version: '1.0.0',
    },
  })
}

// ============================================
// Service Stripe Configuration Types
// ============================================

export interface ServiceStripeConfig {
  useCustomStripeAccount?: boolean
  stripeSecretKey?: string
  stripePublishableKey?: string
  stripeWebhookSecret?: string
  stripeKeyMode?: 'test' | 'live' | 'unknown'
  // Decrypted keys (added by afterRead hook)
  _decryptedSecretKey?: string
  _decryptedWebhookSecret?: string
}

export interface StripeCredentials {
  secretKey: string
  publishableKey: string
  webhookSecret: string
}

/**
 * Get Stripe credentials for a service
 * Returns service-specific credentials if configured, otherwise default credentials
 * Uses decrypted keys if available (set by afterRead hook)
 */
export function getStripeCredentialsForService(
  stripeConfig?: ServiceStripeConfig | null,
): StripeCredentials {
  // Check if service has custom Stripe configuration
  if (stripeConfig?.useCustomStripeAccount && stripeConfig?.stripePublishableKey) {
    // Use decrypted secret key if available, otherwise use the raw value
    const secretKey = stripeConfig._decryptedSecretKey || stripeConfig.stripeSecretKey || ''
    const webhookSecret =
      stripeConfig._decryptedWebhookSecret || stripeConfig.stripeWebhookSecret || ''

    return {
      secretKey,
      publishableKey: stripeConfig.stripePublishableKey,
      webhookSecret,
    }
  }

  // Fall back to default credentials from environment
  return {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOKS_ENDPOINT_SECRET || '',
  }
}

// ============================================
// Re-export Stripe types for convenience
// ============================================

export type { Stripe }
export type PaymentIntent = Stripe.PaymentIntent
export type Customer = Stripe.Customer
export type Subscription = Stripe.Subscription

// ============================================
// Helper Functions for Common Operations
// ============================================

interface CreatePaymentIntentParams {
  amount: number // in dollars (will be converted to cents)
  currency?: string
  metadata?: Record<string, string>
  paymentMethodTypes?: string[]
  stripeSecretKey?: string // Optional: use specific Stripe account
}

/**
 * Create a PaymentIntent with sensible defaults
 * Optionally specify a different Stripe account via stripeSecretKey
 */
export async function createPaymentIntent({
  amount,
  currency = 'usd',
  metadata = {},
  paymentMethodTypes = ['card'],
  stripeSecretKey,
}: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
  const stripe = stripeSecretKey ? getStripeForService(stripeSecretKey) : getStripe()

  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    payment_method_types: paymentMethodTypes,
    metadata,
  })
}

/**
 * Retrieve a PaymentIntent by ID
 */
export async function getPaymentIntent(
  paymentIntentId: string,
  stripeSecretKey?: string,
): Promise<Stripe.PaymentIntent> {
  const stripe = stripeSecretKey ? getStripeForService(stripeSecretKey) : getStripe()
  return stripe.paymentIntents.retrieve(paymentIntentId)
}

/**
 * Cancel a PaymentIntent
 */
export async function cancelPaymentIntent(
  paymentIntentId: string,
  stripeSecretKey?: string,
): Promise<Stripe.PaymentIntent> {
  const stripe = stripeSecretKey ? getStripeForService(stripeSecretKey) : getStripe()
  return stripe.paymentIntents.cancel(paymentIntentId)
}

/**
 * Generate a Payment Link for a specific amount and product name
 */
export async function createPaymentLink({
  amount,
  currency = 'usd',
  productName,
  metadata = {},
  stripeSecretKey,
}: {
  amount: number
  currency?: string
  productName: string
  metadata?: Record<string, string>
  stripeSecretKey?: string
}): Promise<Stripe.PaymentLink> {
  const stripe = stripeSecretKey ? getStripeForService(stripeSecretKey) : getStripe()

  // 1. Create a Price (and implicitly a Product)
  const price = await stripe.prices.create({
    currency,
    unit_amount: Math.round(amount * 100),
    product_data: {
      name: productName,
      metadata,
    },
    metadata,
  })

  // 2. Create the Payment Link
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    metadata,
    // Add any other default behavior here (e.g. redirect URLs)
  })

  return paymentLink
}

// ============================================
// Configuration
// ============================================

export const STRIPE_CONFIG = {
  // Supported payment methods - Cash App only (requires US Stripe account)
  paymentMethods: ['cashapp'] as const,
  // Webhook event types we handle
  webhookEvents: [
    'checkout.session.completed',
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
  ] as const,
} as const
