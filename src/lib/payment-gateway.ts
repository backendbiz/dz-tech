/**
 * Payment Gateway Abstraction Layer
 *
 * Provides a unified interface for payment processing, enabling the platform
 * to support multiple payment gateways simultaneously. Each platform (provider)
 * can optionally be assigned a specific gateway, or fall back to the global default.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                       Gateway Registry                          │
 * │                                                                 │
 * │   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐  │
 * │   │  Stripe  │   │  Square  │   │  PayPal  │   │  Crypto  │  │
 * │   │    ✅    │   │    🔜    │   │    🔜    │   │    🔜    │  │
 * │   └──────────┘   └──────────┘   └──────────┘   └──────────┘  │
 * │                                                                 │
 * │   Global Default: PAYMENT_GATEWAY env var (default: 'stripe')  │
 * │   Per-Provider:   provider.paymentGateway field (optional)     │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Adding a new gateway:
 *   1. Create a class implementing PaymentGateway
 *   2. Register it in the gatewayRegistry map
 *   3. Add required env vars
 *   4. Done — no other code changes needed
 */

import { getStripe, getStripeForService } from '@/lib/stripe'
import type Stripe from 'stripe'

// ============================================
// Core Types & Interface
// ============================================

export type GatewayName = 'stripe' | 'square' | 'paypal' | 'crypto'

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'canceled'

/**
 * Per-provider gateway credentials.
 * When a provider uses their own gateway account, these credentials
 * are decrypted from the Providers collection and passed to the gateway.
 */
export interface GatewayCredentials {
  // Stripe
  stripeSecretKey?: string
  stripePublishableKey?: string
  stripeWebhookSecret?: string
  // Square
  squareAccessToken?: string
  squareLocationId?: string
  squareApplicationId?: string
  // PayPal
  paypalClientId?: string
  paypalClientSecret?: string
  // Crypto
  cryptoGatewayApiKey?: string
}

export interface CreatePaymentParams {
  /** Amount in dollars (will be converted to smallest unit internally) */
  amount: number
  /** Currency code (default: 'usd') */
  currency?: string
  /** Description visible in payment dashboard */
  description?: string
  /** Metadata key-value pairs to attach to the payment */
  metadata?: Record<string, string>
  /** Idempotency key to prevent duplicate payments */
  idempotencyKey?: string
  /** Per-provider credentials (if provider uses their own gateway account) */
  credentials?: GatewayCredentials
}

export interface PaymentResult {
  /** Gateway-specific payment ID (e.g., Stripe PaymentIntent ID, Square payment ID) */
  paymentId: string
  /** Client secret/token for frontend to complete payment */
  clientSecret: string
  /** Current status of the payment */
  status: PaymentStatus
  /** Amount in dollars */
  amount: number
  /** Currency code */
  currency: string
}

export interface RetrievePaymentResult {
  /** Gateway-specific payment ID */
  paymentId: string
  /** Client secret/token for frontend */
  clientSecret: string | null
  /** Current status */
  status: PaymentStatus
  /** Amount in dollars */
  amount: number
}

export interface RefundParams {
  /** Gateway-specific payment ID to refund */
  paymentId: string
  /** Amount to refund in dollars (partial refund). Omit for full refund */
  amount?: number
  /** Reason for the refund */
  reason?: string
}

export interface RefundResult {
  /** Gateway-specific refund ID */
  refundId: string
  /** Amount refunded in dollars */
  amount: number
  /** Refund status */
  status: 'pending' | 'succeeded' | 'failed'
}

export interface GatewayInfo {
  /** Gateway identifier */
  name: GatewayName
  /** Human-readable display name */
  displayName: string
  /** Whether this gateway is fully implemented and ready for production */
  isActive: boolean
  /** Supported payment methods (for UI display) */
  supportedMethods: string[]
  /** Required environment variables */
  requiredEnvVars: string[]
}

/**
 * Payment Gateway Interface
 *
 * All payment gateways must implement this interface.
 * This enables the platform to support multiple providers using different
 * payment gateways without changing business logic.
 */
export interface PaymentGateway {
  /** Gateway identifier (e.g., 'stripe', 'square') */
  readonly name: GatewayName

  /** Human-readable display name */
  readonly displayName: string

  /** Whether this gateway is fully implemented */
  readonly isActive: boolean

  /** Create a new payment */
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>

  /** Retrieve an existing payment by its gateway-specific ID */
  retrievePayment(paymentId: string): Promise<RetrievePaymentResult>

  /** Cancel a payment */
  cancelPayment(paymentId: string): Promise<void>

  /** Refund a payment */
  refundPayment(params: RefundParams): Promise<RefundResult>

  /** Get the publishable/client key for frontend use */
  getPublishableKey(): string

  /** Get gateway info for admin/status display */
  getInfo(): GatewayInfo

  /** Check if the gateway is properly configured (env vars, etc.) */
  isConfigured(): boolean
}

// ============================================
// Stripe Gateway Implementation (Active ✅)
// ============================================

function mapStripeStatus(status: Stripe.PaymentIntent.Status): PaymentStatus {
  switch (status) {
    case 'succeeded':
      return 'succeeded'
    case 'canceled':
      return 'canceled'
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
    case 'processing':
    default:
      return 'pending'
  }
}

export class StripeGateway implements PaymentGateway {
  readonly name: GatewayName = 'stripe'
  readonly displayName = 'Stripe (Cash App Pay)'
  readonly isActive = true

  /**
   * Get the appropriate Stripe instance.
   * Uses the provider's secret key if provided, otherwise falls back to the platform default.
   */
  private getStripeInstance(credentials?: GatewayCredentials): Stripe {
    if (credentials?.stripeSecretKey) {
      // Use provider's own Stripe account
      return getStripeForService(credentials.stripeSecretKey)
    }
    // Use platform's default Stripe account
    return getStripe()
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const stripe = this.getStripeInstance(params.credentials)

    const createParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(params.amount * 100), // Convert to cents
      currency: params.currency || 'usd',
      payment_method_types: ['cashapp'],
      ...(params.description && { description: params.description }),
      ...(params.metadata && { metadata: params.metadata }),
    }

    const options: Stripe.RequestOptions = {}
    if (params.idempotencyKey) {
      options.idempotencyKey = params.idempotencyKey
    }

    const paymentIntent = await stripe.paymentIntents.create(createParams, options)

    return {
      paymentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      status: mapStripeStatus(paymentIntent.status),
      amount: params.amount,
      currency: params.currency || 'usd',
    }
  }

  async retrievePayment(
    paymentId: string,
    credentials?: GatewayCredentials,
  ): Promise<RetrievePaymentResult> {
    const stripe = this.getStripeInstance(credentials)
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentId)

    return {
      paymentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: mapStripeStatus(paymentIntent.status),
      amount: paymentIntent.amount / 100,
    }
  }

  async cancelPayment(paymentId: string, credentials?: GatewayCredentials): Promise<void> {
    const stripe = this.getStripeInstance(credentials)
    await stripe.paymentIntents.cancel(paymentId)
  }

  async refundPayment(
    params: RefundParams,
    credentials?: GatewayCredentials,
  ): Promise<RefundResult> {
    const stripe = this.getStripeInstance(credentials)

    const refund = await stripe.refunds.create({
      payment_intent: params.paymentId,
      ...(params.amount && { amount: Math.round(params.amount * 100) }),
      ...(params.reason && { reason: params.reason as Stripe.RefundCreateParams.Reason }),
    })

    return {
      refundId: refund.id,
      amount: (refund.amount || 0) / 100,
      status:
        refund.status === 'succeeded'
          ? 'succeeded'
          : refund.status === 'failed'
            ? 'failed'
            : 'pending',
    }
  }

  /**
   * Get the publishable key.
   * If provider credentials are available, returns theirs; otherwise platform's.
   */
  getPublishableKey(credentials?: GatewayCredentials): string {
    if (credentials?.stripePublishableKey) {
      return credentials.stripePublishableKey
    }
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
  }

  getInfo(): GatewayInfo {
    return {
      name: 'stripe',
      displayName: this.displayName,
      isActive: true,
      supportedMethods: ['cashapp'],
      requiredEnvVars: [
        'STRIPE_SECRET_KEY',
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
        'STRIPE_WEBHOOKS_ENDPOINT_SECRET',
      ],
    }
  }

  isConfigured(): boolean {
    return !!(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  }
}

// ============================================
// Square Gateway Placeholder (Coming Soon 🔜)
// ============================================

/**
 * Square Payment Gateway
 *
 * Placeholder implementation for Square integration.
 *
 * To implement:
 *   1. Install: npm install square
 *   2. Set env vars: SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, etc.
 *   3. Implement each method using Square's Payments API
 *   4. Set isActive = true
 *
 * Square API docs: https://developer.squareup.com/docs/payments-api/overview
 *
 * Key differences from Stripe:
 *   - Uses "location_id" concept (similar to Stripe's account)
 *   - Payment amounts are in smallest currency unit (cents for USD)
 *   - Uses Web Payments SDK for frontend (similar to Stripe Elements)
 *   - Webhooks use different event structure
 */
export class SquareGateway implements PaymentGateway {
  readonly name: GatewayName = 'square'
  readonly displayName = 'Square'
  readonly isActive = false

  async createPayment(_params: CreatePaymentParams): Promise<PaymentResult> {
    // TODO: Implement with Square Payments API
    // const { paymentsApi } = squareClient
    // const response = await paymentsApi.createPayment({
    //   sourceId: 'EXTERNAL',
    //   idempotencyKey: params.idempotencyKey,
    //   amountMoney: {
    //     amount: BigInt(Math.round(params.amount * 100)),
    //     currency: 'USD',
    //   },
    //   locationId: process.env.SQUARE_LOCATION_ID,
    //   note: params.description,
    // })
    throw new Error(
      'Square gateway is not yet implemented. Set PAYMENT_GATEWAY=stripe to use Stripe.',
    )
  }

  async retrievePayment(_paymentId: string): Promise<RetrievePaymentResult> {
    // TODO: Implement with Square Payments API
    // const { paymentsApi } = squareClient
    // const response = await paymentsApi.getPayment(paymentId)
    throw new Error('Square gateway is not yet implemented.')
  }

  async cancelPayment(_paymentId: string): Promise<void> {
    // TODO: Implement with Square Payments API
    // const { paymentsApi } = squareClient
    // await paymentsApi.cancelPayment(paymentId)
    throw new Error('Square gateway is not yet implemented.')
  }

  async refundPayment(_params: RefundParams): Promise<RefundResult> {
    // TODO: Implement with Square Refunds API
    // const { refundsApi } = squareClient
    // const response = await refundsApi.refundPayment({
    //   idempotencyKey: `refund_${params.paymentId}_${Date.now()}`,
    //   paymentId: params.paymentId,
    //   amountMoney: params.amount
    //     ? { amount: BigInt(Math.round(params.amount * 100)), currency: 'USD' }
    //     : undefined,
    //   reason: params.reason,
    // })
    throw new Error('Square gateway is not yet implemented.')
  }

  getPublishableKey(): string {
    // Square uses Application ID for frontend
    return process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || ''
  }

  getInfo(): GatewayInfo {
    return {
      name: 'square',
      displayName: this.displayName,
      isActive: false,
      supportedMethods: ['card', 'apple_pay', 'google_pay', 'cash_app'],
      requiredEnvVars: [
        'SQUARE_ACCESS_TOKEN',
        'SQUARE_LOCATION_ID',
        'NEXT_PUBLIC_SQUARE_APPLICATION_ID',
        'SQUARE_ENVIRONMENT', // 'sandbox' or 'production'
      ],
    }
  }

  isConfigured(): boolean {
    return !!(
      process.env.SQUARE_ACCESS_TOKEN &&
      process.env.SQUARE_LOCATION_ID &&
      process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
    )
  }
}

// ============================================
// PayPal Gateway Placeholder (Coming Soon 🔜)
// ============================================

/**
 * PayPal Payment Gateway
 *
 * Placeholder implementation for PayPal integration.
 *
 * To implement:
 *   1. Install: npm install @paypal/checkout-server-sdk
 *   2. Set env vars: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, etc.
 *   3. Implement each method using PayPal Orders API v2
 *   4. Set isActive = true
 *
 * PayPal API docs: https://developer.paypal.com/docs/api/orders/v2/
 *
 * Key differences from Stripe:
 *   - Uses "orders" instead of "payment intents"
 *   - Payment amounts are in dollars (not cents)
 *   - Frontend uses PayPal JS SDK buttons
 *   - Two-step: create order → capture order
 */
export class PayPalGateway implements PaymentGateway {
  readonly name: GatewayName = 'paypal'
  readonly displayName = 'PayPal'
  readonly isActive = false

  async createPayment(_params: CreatePaymentParams): Promise<PaymentResult> {
    // TODO: Implement with PayPal Orders API v2
    // const request = new paypal.orders.OrdersCreateRequest()
    // request.requestBody({
    //   intent: 'CAPTURE',
    //   purchase_units: [{
    //     amount: {
    //       currency_code: params.currency?.toUpperCase() || 'USD',
    //       value: params.amount.toFixed(2),
    //     },
    //     description: params.description,
    //     custom_id: params.metadata?.externalId,
    //   }],
    // })
    // const order = await paypalClient.execute(request)
    throw new Error(
      'PayPal gateway is not yet implemented. Set PAYMENT_GATEWAY=stripe to use Stripe.',
    )
  }

  async retrievePayment(_paymentId: string): Promise<RetrievePaymentResult> {
    // TODO: Implement with PayPal Orders API v2
    // const request = new paypal.orders.OrdersGetRequest(paymentId)
    // const order = await paypalClient.execute(request)
    throw new Error('PayPal gateway is not yet implemented.')
  }

  async cancelPayment(_paymentId: string): Promise<void> {
    // TODO: PayPal orders can be voided before capture
    throw new Error('PayPal gateway is not yet implemented.')
  }

  async refundPayment(_params: RefundParams): Promise<RefundResult> {
    // TODO: Implement with PayPal Payments API
    // const request = new paypal.payments.CapturesRefundRequest(captureId)
    // request.requestBody({
    //   amount: params.amount
    //     ? { currency_code: 'USD', value: params.amount.toFixed(2) }
    //     : undefined,
    //   note_to_payer: params.reason,
    // })
    throw new Error('PayPal gateway is not yet implemented.')
  }

  getPublishableKey(): string {
    return process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''
  }

  getInfo(): GatewayInfo {
    return {
      name: 'paypal',
      displayName: this.displayName,
      isActive: false,
      supportedMethods: ['paypal', 'venmo', 'card', 'pay_later'],
      requiredEnvVars: [
        'PAYPAL_CLIENT_ID',
        'PAYPAL_CLIENT_SECRET',
        'NEXT_PUBLIC_PAYPAL_CLIENT_ID',
        'PAYPAL_ENVIRONMENT', // 'sandbox' or 'live'
      ],
    }
  }

  isConfigured(): boolean {
    return !!(
      process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET &&
      process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    )
  }
}

// ============================================
// Crypto Gateway Placeholder (Coming Soon 🔜)
// ============================================

/**
 * Cryptocurrency Payment Gateway
 *
 * Placeholder for crypto payment integration (e.g., Coinbase Commerce, BTCPay).
 *
 * To implement:
 *   1. Choose a provider (Coinbase Commerce, BTCPay Server, etc.)
 *   2. Install the appropriate SDK
 *   3. Implement each method
 *   4. Set isActive = true
 *
 * Key differences from traditional gateways:
 *   - Payments are typically one-way (no easy refunds on-chain)
 *   - Need to handle exchange rate volatility
 *   - Confirmation times vary by blockchain
 *   - Webhooks/IPN for payment confirmation
 */
export class CryptoGateway implements PaymentGateway {
  readonly name: GatewayName = 'crypto'
  readonly displayName = 'Cryptocurrency'
  readonly isActive = false

  async createPayment(_params: CreatePaymentParams): Promise<PaymentResult> {
    // TODO: Implement with chosen crypto payment provider
    throw new Error(
      'Crypto gateway is not yet implemented. Set PAYMENT_GATEWAY=stripe to use Stripe.',
    )
  }

  async retrievePayment(_paymentId: string): Promise<RetrievePaymentResult> {
    throw new Error('Crypto gateway is not yet implemented.')
  }

  async cancelPayment(_paymentId: string): Promise<void> {
    throw new Error('Crypto gateway is not yet implemented.')
  }

  async refundPayment(_params: RefundParams): Promise<RefundResult> {
    throw new Error('Crypto gateway does not support automatic refunds.')
  }

  getPublishableKey(): string {
    return process.env.NEXT_PUBLIC_CRYPTO_GATEWAY_KEY || ''
  }

  getInfo(): GatewayInfo {
    return {
      name: 'crypto',
      displayName: this.displayName,
      isActive: false,
      supportedMethods: ['bitcoin', 'ethereum', 'usdc', 'usdt'],
      requiredEnvVars: [
        'CRYPTO_GATEWAY_API_KEY',
        'CRYPTO_GATEWAY_WEBHOOK_SECRET',
        'NEXT_PUBLIC_CRYPTO_GATEWAY_KEY',
      ],
    }
  }

  isConfigured(): boolean {
    return !!process.env.CRYPTO_GATEWAY_API_KEY
  }
}

// ============================================
// Gateway Registry & Factory
// ============================================

/**
 * Registry of all available payment gateways.
 * To add a new gateway, simply add it here.
 */
const gatewayRegistry = new Map<GatewayName, () => PaymentGateway>()

// Singleton cache to avoid re-instantiation
const gatewayInstances = new Map<GatewayName, PaymentGateway>()

// Register all gateways
gatewayRegistry.set('stripe', () => new StripeGateway())
gatewayRegistry.set('square', () => new SquareGateway())
gatewayRegistry.set('paypal', () => new PayPalGateway())
gatewayRegistry.set('crypto', () => new CryptoGateway())

/**
 * Get a specific payment gateway by name.
 * Returns a singleton instance.
 */
export function getGatewayByName(name: GatewayName): PaymentGateway {
  let instance = gatewayInstances.get(name)
  if (instance) return instance

  const factory = gatewayRegistry.get(name)
  if (!factory) {
    throw new Error(
      `Unknown payment gateway: "${name}". Available gateways: ${Array.from(gatewayRegistry.keys()).join(', ')}`,
    )
  }

  instance = factory()
  gatewayInstances.set(name, instance)
  return instance
}

/**
 * Get the default (global) payment gateway.
 * Configured via PAYMENT_GATEWAY env variable (defaults to 'stripe').
 */
export function getPaymentGateway(): PaymentGateway {
  const name = getActiveGatewayName()
  return getGatewayByName(name)
}

/**
 * Get the payment gateway for a specific provider.
 * Falls back to the global default if the provider doesn't specify one.
 *
 * @param providerGateway - Optional gateway name from the provider's config
 */
export function getProviderGateway(providerGateway?: string | null): PaymentGateway {
  if (providerGateway && gatewayRegistry.has(providerGateway as GatewayName)) {
    return getGatewayByName(providerGateway as GatewayName)
  }
  return getPaymentGateway()
}

/**
 * Get the name of the active (global default) payment gateway.
 */
export function getActiveGatewayName(): GatewayName {
  return (process.env.PAYMENT_GATEWAY as GatewayName) || 'stripe'
}

/**
 * Get info for all registered gateways.
 * Useful for admin dashboards to show available/configured gateways.
 */
export function getAllGatewayInfo(): GatewayInfo[] {
  return Array.from(gatewayRegistry.keys()).map((name) => {
    const gateway = getGatewayByName(name)
    return gateway.getInfo()
  })
}

/**
 * Get only the gateways that are fully implemented and active.
 */
export function getActiveGateways(): GatewayInfo[] {
  return getAllGatewayInfo().filter((info) => info.isActive)
}

/**
 * Get a list of all registered gateway names.
 */
export function getRegisteredGatewayNames(): GatewayName[] {
  return Array.from(gatewayRegistry.keys())
}

/**
 * Check if a gateway name is valid/registered.
 */
export function isValidGatewayName(name: string): name is GatewayName {
  return gatewayRegistry.has(name as GatewayName)
}
