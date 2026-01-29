/**
 * Order ID Generator
 * Generates unique order IDs in the format: ORD-YYYYMMDD-HHMMSS-XXXXX
 * Example: ORD-20260128-143052-X7K9P
 */

/**
 * Generates a random alphanumeric string
 * @param length - Length of the random string
 * @returns Random alphanumeric string
 */
function generateRandomString(length: number = 5): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Pads a number with leading zeros
 * @param num - Number to pad
 * @param size - Desired string length
 * @returns Padded string
 */
function padNumber(num: number, size: number): string {
  return String(num).padStart(size, '0')
}

/**
 * Generates a unique order ID
 * Format: ORD-YYYYMMDD-HHMMSS-XXXXX
 * @returns Unique order ID string
 */
export function generateOrderId(): string {
  const now = new Date()

  const year = now.getFullYear()
  const month = padNumber(now.getMonth() + 1, 2)
  const day = padNumber(now.getDate(), 2)
  const hours = padNumber(now.getHours(), 2)
  const minutes = padNumber(now.getMinutes(), 2)
  const seconds = padNumber(now.getSeconds(), 2)

  const datePart = `${year}${month}${day}`
  const timePart = `${hours}${minutes}${seconds}`
  const randomPart = generateRandomString(5)

  return `ORD-${datePart}-${timePart}-${randomPart}`
}

/**
 * Validates an order ID format
 * @param orderId - Order ID to validate
 * @returns Boolean indicating if the format is valid
 */
export function validateOrderId(orderId: string): boolean {
  // Pattern: ORD-YYYYMMDD-HHMMSS-XXXXX
  const pattern = /^ORD-\d{8}-\d{6}-[A-Z0-9]{5}$/
  return pattern.test(orderId)
}

/**
 * Parses an order ID to extract its components
 * @param orderId - Order ID to parse
 * @returns Object containing date, time, and random parts, or null if invalid
 */
export function parseOrderId(orderId: string): {
  date: string
  time: string
  random: string
  createdAt: Date
} | null {
  if (!validateOrderId(orderId)) {
    return null
  }

  const parts = orderId.split('-')
  const datePart = parts[1] // YYYYMMDD
  const timePart = parts[2] // HHMMSS
  const randomPart = parts[3] // XXXXX

  // Parse the date
  const year = parseInt(datePart.substring(0, 4))
  const month = parseInt(datePart.substring(4, 6)) - 1 // Month is 0-indexed
  const day = parseInt(datePart.substring(6, 8))
  const hours = parseInt(timePart.substring(0, 2))
  const minutes = parseInt(timePart.substring(2, 4))
  const seconds = parseInt(timePart.substring(4, 6))

  return {
    date: `${datePart.substring(0, 4)}-${datePart.substring(4, 6)}-${datePart.substring(6, 8)}`,
    time: `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}:${timePart.substring(4, 6)}`,
    random: randomPart,
    createdAt: new Date(year, month, day, hours, minutes, seconds),
  }
}
