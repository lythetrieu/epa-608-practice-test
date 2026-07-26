// Shared helpers for the Polar checkout routes.

// TLDs reserved by RFC 2606 / 6761 / 6762 — they can never belong to a real
// mailbox, and Polar's validator rejects the whole checkout request when one
// shows up in customer_email ("special-use or reserved name").
const RESERVED_TLDS = ['local', 'localhost', 'test', 'example', 'invalid']

/**
 * The customer_email to send to Polar, or undefined to omit the field.
 *
 * Omitting is safe: the buyer is identified by customer_external_id (their
 * Supabase user id), so customer_email only pre-fills the payment form. Sending
 * an address Polar can't parse costs far more than skipping it — a 422 there
 * fails the ENTIRE checkout creation, which is how the e2e personas
 * (…@epa608-test.local) silently took down their own checkout path.
 */
export function polarCustomerEmail(email: string): string | undefined {
  const clean = (email ?? '').toLowerCase().trim()
  if (!clean || !clean.includes('@')) return undefined
  const domain = clean.split('@').pop() ?? ''
  const tld = domain.split('.').pop() ?? ''
  if (!domain.includes('.') || RESERVED_TLDS.includes(tld)) return undefined
  return clean
}
