import crypto from 'crypto'

// ============================================
// Encryption Configuration
// ============================================

// Use a dedicated encryption key from environment or derive from PAYLOAD_SECRET
const getEncryptionKey = (): Buffer => {
  const key = process.env.STRIPE_ENCRYPTION_KEY || process.env.PAYLOAD_SECRET

  if (!key) {
    throw new Error('STRIPE_ENCRYPTION_KEY or PAYLOAD_SECRET must be set for encryption')
  }

  // Create a 32-byte key using SHA-256 hash of the secret
  return crypto.createHash('sha256').update(key).digest()
}

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

// ============================================
// Encryption Functions
// ============================================

/**
 * Encrypt a string value (e.g., Stripe API key)
 * Returns a base64-encoded string containing IV + encrypted data + auth tag
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return ''

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])

  const authTag = cipher.getAuthTag()

  // Combine IV + encrypted data + auth tag
  const combined = Buffer.concat([iv, encrypted, authTag])

  return combined.toString('base64')
}

/**
 * Decrypt a previously encrypted string
 * Expects a base64-encoded string containing IV + encrypted data + auth tag
 */
export function decrypt(encryptedBase64: string): string {
  if (!encryptedBase64) return ''

  try {
    const key = getEncryptionKey()
    const combined = Buffer.from(encryptedBase64, 'base64')

    // Extract IV, encrypted data, and auth tag
    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
  } catch (error) {
    console.error('Decryption failed:', error)
    // Return empty string if decryption fails (key might have changed)
    return ''
  }
}

/**
 * Check if a string appears to be encrypted (base64 with correct length)
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false

  try {
    const decoded = Buffer.from(value, 'base64')
    // Encrypted values should be at least IV + some data + auth tag
    return decoded.length >= IV_LENGTH + AUTH_TAG_LENGTH + 1
  } catch {
    return false
  }
}

/**
 * Mask a sensitive key for display (show first 7 and last 4 characters)
 * e.g., "sk_test_xxxxxxxxxxxxx1234" -> "sk_test...1234"
 */
export function maskKey(key: string): string {
  if (!key || key.length < 15) return '••••••••'

  const prefix = key.substring(0, 7)
  const suffix = key.substring(key.length - 4)

  return `${prefix}...${suffix}`
}

// ============================================
// Key Format Validation
// ============================================

/**
 * Validate Stripe secret key format
 */
export function isValidSecretKeyFormat(key: string): boolean {
  if (!key) return false
  // Stripe secret keys start with sk_test_ or sk_live_ followed by alphanumeric characters
  return /^sk_(test|live)_[a-zA-Z0-9]{24,}$/.test(key)
}

/**
 * Validate Stripe publishable key format
 */
export function isValidPublishableKeyFormat(key: string): boolean {
  if (!key) return false
  // Stripe publishable keys start with pk_test_ or pk_live_ followed by alphanumeric characters
  return /^pk_(test|live)_[a-zA-Z0-9]{24,}$/.test(key)
}

/**
 * Validate Stripe webhook secret format
 */
export function isValidWebhookSecretFormat(secret: string): boolean {
  if (!secret) return false
  // Webhook secrets start with whsec_ followed by alphanumeric characters
  return /^whsec_[a-zA-Z0-9]{24,}$/.test(secret)
}

/**
 * Check if secret key is test mode
 */
export function isTestModeKey(key: string): boolean {
  return key?.startsWith('sk_test_') || key?.startsWith('pk_test_')
}

/**
 * Check if keys are mismatched (one is live, one is test)
 */
export function areKeysMismatched(secretKey: string, publishableKey: string): boolean {
  if (!secretKey || !publishableKey) return false
  const secretIsTest = secretKey.startsWith('sk_test_')
  const publishableIsTest = publishableKey.startsWith('pk_test_')
  return secretIsTest !== publishableIsTest
}

/**
 * Get key mode (test or live)
 */
export function getKeyMode(key: string): 'test' | 'live' | 'unknown' {
  if (!key) return 'unknown'
  if (key.includes('_test_')) return 'test'
  if (key.includes('_live_')) return 'live'
  return 'unknown'
}
