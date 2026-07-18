// Hardening for the Supabase session cookie.
//
// The daily QA canary caught `sb-<ref>-auth-token` going out WITHOUT the Secure
// flag on https://app.epa608practicetest.net, which means the session token
// would ride along on any accidental plain-http request. Every place that
// writes the cookie (browser client, server client, middleware) shares these.
//
// `secure` is production-only so local http://localhost development keeps
// working. HttpOnly is deliberately absent: @supabase/ssr's browser client
// reads the session from document.cookie, so it cannot be HttpOnly without
// moving to a server-only auth architecture — the CSP is the mitigation there.
export const SUPABASE_COOKIE_OPTIONS = {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}
