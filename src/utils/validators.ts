/**
 * Validate Indian mobile number
 */
export function isValidMobile(mobile: string): boolean {
  const cleaned = mobile.replace(/\D/g, '')
  return /^[6-9]\d{9}$/.test(cleaned) ||
         /^91[6-9]\d{9}$/.test(cleaned)
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Validate positive number
 */
export function isValidAmount(amount: number | string): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return !isNaN(num) && num > 0
}

/**
 * Validate invite code format (6 alphanumeric chars)
 */
export function isValidCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code.toUpperCase())
}

/**
 * Validate password strength (min 6 chars)
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 6
}
