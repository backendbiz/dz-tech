import { Client, Environment, OrdersController } from '@paypal/paypal-server-sdk'

// Singleton PayPal client
let paypalClient: Client | null = null

/**
 * Get or create the PayPal SDK client (singleton)
 */
export function getPayPalClient(): Client {
  if (!paypalClient) {
    const clientId = process.env.PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set')
    }

    const environment =
      process.env.PAYPAL_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox

    paypalClient = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: clientId,
        oAuthClientSecret: clientSecret,
      },
      environment,
    })
  }

  return paypalClient
}

/**
 * Get a PayPal OrdersController instance
 */
export function getPayPalOrdersController(): OrdersController {
  return new OrdersController(getPayPalClient())
}

/**
 * Check if PayPal is configured (env vars present)
 */
export function isPayPalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
}
