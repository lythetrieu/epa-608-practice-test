import { describe, it, expect } from 'vitest'
import { NextResponse } from 'next/server'
import { APP_HOST, isAppHost, tagNoindex, appRootRedirectPath } from '../middleware'

function reqWithHost(host: string | null) {
  return { headers: new Headers(host ? { host } : {}) }
}

describe('app-subdomain noindex gating', () => {
  it('detects the app subdomain host', () => {
    expect(isAppHost(reqWithHost(APP_HOST))).toBe(true)
  })

  it('detects the app subdomain host with a port', () => {
    expect(isAppHost(reqWithHost(`${APP_HOST}:443`))).toBe(true)
  })

  it('does NOT match the marketing root host', () => {
    expect(isAppHost(reqWithHost('epa608practicetest.net'))).toBe(false)
  })

  it('does NOT match www or other hosts', () => {
    expect(isAppHost(reqWithHost('www.epa608practicetest.net'))).toBe(false)
    expect(isAppHost(reqWithHost('preview-abc.vercel.app'))).toBe(false)
  })

  it('does NOT match a missing host header', () => {
    expect(isAppHost(reqWithHost(null))).toBe(false)
  })

  it('attaches noindex header only when on the app host', () => {
    const onApp = tagNoindex(NextResponse.next(), true)
    expect(onApp.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')

    const onRoot = tagNoindex(NextResponse.next(), false)
    expect(onRoot.headers.get('X-Robots-Tag')).toBeNull()
  })

  it('tags redirects too (e.g. protected-route bounce)', () => {
    const res = tagNoindex(NextResponse.redirect('https://app.epa608practicetest.net/login'), true)
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
  })
})

describe('app-subdomain root redirect destination', () => {
  it('sends a confirmed user to the dashboard', () => {
    expect(appRootRedirectPath(true)).toBe('/dashboard')
  })

  it('sends an anonymous/unconfirmed visitor to login', () => {
    expect(appRootRedirectPath(false)).toBe('/login')
  })
})
