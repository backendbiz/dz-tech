import crypto from 'crypto'

/**
 * Checkout Token Generator
 *
 * Generates a cryptographically secure, unguessable token for checkout URLs.
 * Uses 16 random bytes (128 bits of entropy) encoded as a 32-character hex string.
 *
 * Example: caa36d0b5aed3f52d2eab944d5b1bdb5
 *
 * This replaces the old pattern of exposing serviceId + orderId in the URL.
 * The token is stored on the order document and used to look up the checkout session.
 */

/**
 * Generates a cryptographically random checkout token
 * @returns 32-character hex string (128 bits of entropy)
 */
export function generateCheckoutToken(): string {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Validates a checkout token format
 * @param token - Token to validate
 * @returns Boolean indicating if the format is valid (32 hex characters)
 */
export function isValidCheckoutToken(token: string): boolean {
  return /^[a-f0-9]{32}$/.test(token)
}
