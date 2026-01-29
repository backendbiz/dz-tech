import type { CollectionBeforeChangeHook, CollectionAfterReadHook } from 'payload'
import Stripe from 'stripe'
import {
  encrypt,
  decrypt,
  isEncrypted,
  isValidSecretKeyFormat,
  isValidPublishableKeyFormat,
  isValidWebhookSecretFormat,
  areKeysMismatched,
  getKeyMode,
} from '@/lib/encryption'

// ============================================
// Before Change Hook - Encrypt & Validate Keys
// ============================================

export const encryptStripeKeys: CollectionBeforeChangeHook = async ({
  data,
  originalDoc: _originalDoc,
  operation: _operation,
}) => {
  // Only process if stripeConfig exists and useCustomStripeAccount is enabled
  if (!data.stripeConfig?.useCustomStripeAccount) {
    return data
  }

  const stripeConfig = data.stripeConfig
  const errors: string[] = []

  // Validate secret key format
  if (stripeConfig.stripeSecretKey) {
    // Only validate if it looks like a new key (not already encrypted)
    if (!isEncrypted(stripeConfig.stripeSecretKey)) {
      if (!isValidSecretKeyFormat(stripeConfig.stripeSecretKey)) {
        errors.push('Invalid Stripe secret key format. Must start with sk_test_ or sk_live_')
      }
    }
  }

  // Validate publishable key format
  if (stripeConfig.stripePublishableKey) {
    if (!isValidPublishableKeyFormat(stripeConfig.stripePublishableKey)) {
      errors.push('Invalid Stripe publishable key format. Must start with pk_test_ or pk_live_')
    }
  }

  // Validate webhook secret format (optional field)
  if (stripeConfig.stripeWebhookSecret && !isEncrypted(stripeConfig.stripeWebhookSecret)) {
    if (!isValidWebhookSecretFormat(stripeConfig.stripeWebhookSecret)) {
      errors.push('Invalid webhook secret format. Must start with whsec_')
    }
  }

  // Check for test/live mismatch
  const secretKey = isEncrypted(stripeConfig.stripeSecretKey)
    ? decrypt(stripeConfig.stripeSecretKey)
    : stripeConfig.stripeSecretKey

  if (secretKey && stripeConfig.stripePublishableKey) {
    if (areKeysMismatched(secretKey, stripeConfig.stripePublishableKey)) {
      errors.push(
        'Secret key and publishable key mode mismatch. Both must be test or both must be live.',
      )
    }
  }

  // If there are validation errors, throw them
  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }

  // Validate key works with Stripe API (only for new/changed keys)
  if (stripeConfig.stripeSecretKey && !isEncrypted(stripeConfig.stripeSecretKey)) {
    try {
      const stripe = new Stripe(stripeConfig.stripeSecretKey, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        apiVersion: '2024-12-18.acacia' as any,
      })

      // Try to retrieve account info to validate the key
      await stripe.accounts.retrieve()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Invalid Stripe secret key: ${message}`)
    }
  }

  // Encrypt sensitive keys before saving
  if (stripeConfig.stripeSecretKey && !isEncrypted(stripeConfig.stripeSecretKey)) {
    data.stripeConfig.stripeSecretKey = encrypt(stripeConfig.stripeSecretKey)
  }

  if (stripeConfig.stripeWebhookSecret && !isEncrypted(stripeConfig.stripeWebhookSecret)) {
    data.stripeConfig.stripeWebhookSecret = encrypt(stripeConfig.stripeWebhookSecret)
  }

  // Store the key mode for display purposes
  const keyMode = getKeyMode(secretKey || '')
  data.stripeConfig.stripeKeyMode = keyMode

  return data
}

// ============================================
// After Read Hook - Decrypt Keys for Use
// ============================================

export const decryptStripeKeysForAPI: CollectionAfterReadHook = async ({ doc }) => {
  if (!doc?.stripeConfig?.useCustomStripeAccount) {
    return doc
  }

  // Decrypt keys for API use (not for admin display)
  if (doc.stripeConfig.stripeSecretKey && isEncrypted(doc.stripeConfig.stripeSecretKey)) {
    doc.stripeConfig._decryptedSecretKey = decrypt(doc.stripeConfig.stripeSecretKey)
  }

  if (doc.stripeConfig.stripeWebhookSecret && isEncrypted(doc.stripeConfig.stripeWebhookSecret)) {
    doc.stripeConfig._decryptedWebhookSecret = decrypt(doc.stripeConfig.stripeWebhookSecret)
  }

  return doc
}
