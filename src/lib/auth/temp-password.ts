// Generates a readable, strong temporary password for accounts created
// server-side (e.g. after a PayPal purchase). The customer logs in with this
// and changes it in Settings → Change Password.
//
// This replaces the fragile "email a recovery link to set a password" flow:
// login-with-password + the Settings change-password form are both proven to
// work in every browser, with no token_hash / PKCE / email-prefetch pitfalls.

// Unambiguous character sets (no I/l/1, O/o/0) so customers can retype it.
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
const DIGITS = '23456789'

function pick(set: string, count: number): string {
  const buf = new Uint32Array(count)
  crypto.getRandomValues(buf)
  let out = ''
  for (let i = 0; i < count; i++) out += set[buf[i] % set.length]
  return out
}

/** e.g. "EPA-Kp7mRqab-42" — 8 letters + 2 digits, prefixed for recognizability. */
export function generateTempPassword(): string {
  return `EPA-${pick(LETTERS, 8)}-${pick(DIGITS, 2)}`
}
