/**
 * Real-world user interaction scenarios for checkout.html
 * Uses JSDOM to simulate actual browser behaviour.
 *
 * Cross-realm rule: all Promises that JSDOM code awaits must be created with
 * `win.Promise` (JSDOM's realm), not with vi.fn().mockResolvedValue() (outer realm).
 * Fetch responses are driven by `win.__fetchQ` — a plain-object queue set from
 * the test that the in-page mock reads synchronously.
 */
import { describe, it, expect, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const CHECKOUT_HTML = readFileSync(resolve(process.cwd(), 'public/checkout.html'), 'utf-8')

// ── JSDOM factory ─────────────────────────────────────────────────────────────

function buildHtml(opts: { cardEligible?: boolean } = {}) {
  const eligible = opts.cardEligible !== false

  // Injected BEFORE the PayPal SDK <script src> tag so window.paypal is defined
  // when tryInit() runs at the bottom of the inline script.
  // ALL Promises here use the page's own Promise (same realm) so .then() chains work.
  const stub = `<script>
(function () {
  // ── Fetch queue (tests populate win.__fetchQ) ──────────────────────────
  window.__fetchQ      = [];   // [{ok, json}, ...] — set by test helper
  window.__fetchQIndex = 0;
  window.__fetchLog    = [];   // [{url, body}] — for assertions

  window.fetch = function (url, opts) {
    var entry = { url: String(url), body: opts && opts.body ? JSON.parse(opts.body) : null };
    window.__fetchLog.push(entry);

    var r;
    if (window.__fetchQ.length > 0) {
      r = window.__fetchQ[Math.min(window.__fetchQIndex, window.__fetchQ.length - 1)];
      window.__fetchQIndex++;
    } else if (String(url).includes('create-order')) {
      r = { json: { orderID: 'PREFETCH-123', finalPrice: 14.99 } };
    } else {
      r = { json: {} };
    }

    var ok  = r ? r.ok !== false : true;
    var jsn = r ? r.json : {};
    return Promise.resolve({ ok: ok, json: function () { return Promise.resolve(jsn); } });
  };

  // ── PayPal mock ────────────────────────────────────────────────────────
  window.paypal = {
    Buttons: function (opts) {
      window.__ppButtons = opts;
      return { render: function () {} };
    },
    CardFields: function (opts) {
      window.__ppCard = opts;
      return {
        isEligible: function () { return ${eligible}; },
        NumberField: function () { return { render: function () {} }; },
        ExpiryField: function () { return { render: function () {} }; },
        CVVField:    function () { return { render: function () {} }; },
        submit: function (data) {
          window.__ppCardSubmitData = data;
          if (window.__ppCardShouldFail) {
            return Promise.reject(new Error('card declined'));
          }
          return Promise.resolve();
        }
      };
    }
  };
})();
</script>`

  return CHECKOUT_HTML.replace(
    '<script src="https://www.paypal.com/sdk/js',
    stub + '\n<script src="https://www.paypal.com/sdk/js'
  )
}

type Win = any

async function createPage(opts: { cardEligible?: boolean } = {}): Promise<{ win: Win; doc: Document }> {
  const dom = new JSDOM(buildHtml(opts), {
    url: 'https://epa608practicetest.net/checkout.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  })
  const win = dom.window as Win
  const doc  = dom.window.document
  await tick(40)  // let prefetchOrder settle
  return { win, doc }
}

/** Let pending microtasks/timers resolve. */
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms))

/** Set fetch responses for the next n calls (resets queue + log). */
function setQ(win: Win, responses: Array<{ ok?: boolean; json: object }>) {
  win.__fetchQ      = responses
  win.__fetchQIndex = 0
  win.__fetchLog    = []
}

/** Build a capture-style `actions` object using JSDOM's realm Promise. */
function makeActions(win: Win, payerEmail = 'payer@paypal.com') {
  return {
    order: {
      capture: () => new win.Promise((resolve: (v: unknown) => void) =>
        resolve({ payer: { email_address: payerEmail } })
      )
    }
  }
}

function fill(doc: Document, id: string, value: string) {
  const el = doc.getElementById(id) as HTMLInputElement
  el.value = value
}

function click(doc: Document, id: string) {
  ;(doc.getElementById(id) as HTMLElement).click()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Checkout page — real user scenarios', () => {

  // ── 1. Page load ─────────────────────────────────────────────────────────

  it('PayPal buttons rendered, card section visible on load', async () => {
    const { win, doc } = await createPage()
    expect(win.__ppButtons).toBeDefined()
    expect(win.__ppCard).toBeDefined()
    expect(doc.getElementById('card-section')!.style.display).not.toBe('none')
  })

  it('skeleton removed from #paypal-btn-wrap after init', async () => {
    const { doc } = await createPage()
    expect(doc.getElementById('paypal-btn-wrap')!.querySelector('.paypal-skeleton')).toBeNull()
  })

  it('prefetchOrder populates cachedOrderData on load', async () => {
    const { win } = await createPage()
    expect(win.cachedOrderData).toMatchObject({ orderID: 'PREFETCH-123' })
  })

  // ── 2. Promo code ────────────────────────────────────────────────────────

  it('valid promo → price updates, cache cleared, new prefetch with code', async () => {
    const { win, doc } = await createPage()
    setQ(win, [
      { json: { valid: true, code: 'SAVE50', discount: 50, finalPrice: 7.50 } },
      { json: { orderID: 'PROMO-PREFETCH', finalPrice: 7.50 } },
    ])

    fill(doc, 'promo-input', 'SAVE50')
    doc.querySelector<HTMLButtonElement>('.promo-apply-btn')!.click()
    await tick()

    expect(doc.getElementById('price-display')!.textContent).toBe('$7.50')
    expect(doc.getElementById('promo-msg')!.textContent).toContain('50% off')
    expect(win.finalPrice).toBe(7.50)
    expect(win.cachedOrderData?.orderID).toBe('PROMO-PREFETCH')
  })

  it('promo sets discount code in prefetch fetch body', async () => {
    const { win, doc } = await createPage()
    setQ(win, [
      { json: { valid: true, code: 'VIP20', discount: 20, finalPrice: 11.99 } },
      { json: { orderID: 'VIP-PREFETCH', finalPrice: 11.99 } },
    ])

    fill(doc, 'promo-input', 'VIP20')
    doc.querySelector<HTMLButtonElement>('.promo-apply-btn')!.click()
    await tick()

    // Second fetch call (prefetch) should carry the discount code
    const prefetchCall = win.__fetchLog.find((e: any) => e.url.includes('create-order') && e.body?.discountCode)
    expect(prefetchCall?.body?.discountCode).toBe('VIP20')
  })

  it('invalid promo → error shown, price unchanged at $14.99', async () => {
    const { win, doc } = await createPage()
    setQ(win, [{ json: { valid: false } }])

    fill(doc, 'promo-input', 'BADCODE')
    doc.querySelector<HTMLButtonElement>('.promo-apply-btn')!.click()
    await tick()

    expect(doc.getElementById('promo-msg')!.textContent).toContain('Invalid')
    expect(win.finalPrice).toBe(14.99)
  })

  it('promo network error → friendly message, price unchanged', async () => {
    const { win, doc } = await createPage()
    // Override with a rejection inside JSDOM realm
    win.fetch = function() { return win.Promise.reject(new win.Error('network')); }

    fill(doc, 'promo-input', 'CODE')
    doc.querySelector<HTMLButtonElement>('.promo-apply-btn')!.click()
    await tick()

    expect(doc.getElementById('promo-msg')!.textContent).toContain('Try again')
    expect(win.finalPrice).toBe(14.99)
  })

  // ── 3. Card form validation ───────────────────────────────────────────────

  it('Pay with empty email → error shown, submit blocked', async () => {
    const { doc } = await createPage()
    fill(doc, 'buyer-email', '')
    click(doc, 'card-pay-btn')

    const err = doc.getElementById('card-error')!
    expect(err.style.display).toBe('block')
    expect(err.textContent).toContain('email')
  })

  it('Pay with invalid email (no @) → error shown', async () => {
    const { doc } = await createPage()
    fill(doc, 'buyer-email', 'notanemail')
    click(doc, 'card-pay-btn')
    expect(doc.getElementById('card-error')!.style.display).toBe('block')
  })

  it('fixing email then resubmitting → error cleared', async () => {
    const { win, doc } = await createPage()
    fill(doc, 'buyer-email', '')
    click(doc, 'card-pay-btn')
    expect(doc.getElementById('card-error')!.style.display).toBe('block')

    // Second attempt with valid email — card submit hangs (no resolve)
    win.__ppCard.submit = () => new win.Promise(() => {})
    fill(doc, 'buyer-email', 'user@test.com')
    click(doc, 'card-pay-btn')

    expect(doc.getElementById('card-error')!.style.display).toBe('none')
  })

  // ── 4. Double-submit prevention ──────────────────────────────────────────

  it('clicking Pay twice → button disabled, submit called at most once', async () => {
    const { win, doc } = await createPage()
    let submitCount = 0
    win._cardFields = { submit: () => { submitCount++; return new win.Promise(() => {}); } }

    fill(doc, 'buyer-email', 'x@x.com')
    click(doc, 'card-pay-btn')
    click(doc, 'card-pay-btn')
    await tick()

    expect((doc.getElementById('card-pay-btn') as HTMLButtonElement).disabled).toBe(true)
    expect(submitCount).toBe(1)
  })

  // ── 5. Billing address passed to PayPal ───────────────────────────────────

  it('name and zip sent in billingAddress to cardFields.submit()', async () => {
    const { doc } = await createPage()
    fill(doc, 'buyer-email', 'x@x.com')
    fill(doc, 'card-name', 'Jane Doe')
    fill(doc, 'card-zip', '10001')
    click(doc, 'card-pay-btn')
    await tick()

    expect((doc.defaultView as any).__ppCardSubmitData).toMatchObject({
      billingAddress: { countryCode: 'US', postalCode: '10001', firstName: 'Jane', lastName: 'Doe' }
    })
  })

  it('single-word name → firstName and lastName both set to that name', async () => {
    const { doc } = await createPage()
    fill(doc, 'buyer-email', 'x@x.com')
    fill(doc, 'card-name', 'Cher')
    click(doc, 'card-pay-btn')
    await tick()

    const addr = (doc.defaultView as any).__ppCardSubmitData.billingAddress
    expect(addr.firstName).toBe('Cher')
    expect(addr.lastName).toBe('Cher')
  })

  it('empty name/zip → fields omitted (undefined) from billingAddress', async () => {
    const { doc } = await createPage()
    fill(doc, 'buyer-email', 'x@x.com')
    fill(doc, 'card-name', '')
    fill(doc, 'card-zip', '')
    click(doc, 'card-pay-btn')
    await tick()

    const addr = (doc.defaultView as any).__ppCardSubmitData.billingAddress
    expect(addr.postalCode).toBeUndefined()
    expect(addr.firstName).toBeUndefined()
  })

  // ── 6. Card payment — success paths ──────────────────────────────────────

  it('card payment new account → success overlay, normal message, button reset', async () => {
    const { win, doc } = await createPage()
    setQ(win, [{ json: { ok: true, newAccount: true } }])

    fill(doc, 'buyer-email', 'new@test.com')
    click(doc, 'card-pay-btn')
    await win.__ppCard.onApprove({ orderID: 'CARD-NEW' })
    await tick()

    expect(doc.getElementById('success-overlay')!.style.display).toBe('flex')
    expect(doc.getElementById('success-msg-normal')!.style.display).not.toBe('none')
    expect(doc.getElementById('success-msg-setupfailed')!.style.display).toBe('none')

    const btn = doc.getElementById('card-pay-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    expect(btn.classList.contains('loading')).toBe(false)
  })

  it('card payment existing account → success overlay, same normal message', async () => {
    const { win, doc } = await createPage()
    setQ(win, [{ json: { ok: true, newAccount: false } }])

    fill(doc, 'buyer-email', 'old@test.com')
    click(doc, 'card-pay-btn')
    await win.__ppCard.onApprove({ orderID: 'CARD-EXIST' })
    await tick()

    expect(doc.getElementById('success-overlay')!.style.display).toBe('flex')
  })

  it('card payment — createUser failed (setupFailed) → signup message shown', async () => {
    const { win, doc } = await createPage()
    setQ(win, [{ json: { ok: true, setupFailed: true } }])

    fill(doc, 'buyer-email', 'fail@test.com')
    click(doc, 'card-pay-btn')
    await win.__ppCard.onApprove({ orderID: 'CARD-FAIL' })
    await tick()

    expect(doc.getElementById('success-overlay')!.style.display).toBe('flex')
    expect(doc.getElementById('success-msg-setupfailed')!.style.display).toBe('block')
    expect(doc.getElementById('success-msg-normal')!.style.display).toBe('none')
  })

  it('card capture error from server → captureError overlay with orderID', async () => {
    const { win, doc } = await createPage()
    setQ(win, [{ ok: false, json: { error: 'Verification failed' } }])

    fill(doc, 'buyer-email', 'x@x.com')
    click(doc, 'card-pay-btn')
    await win.__ppCard.onApprove({ orderID: 'CARD-SERVER-ERR' })
    await tick()

    expect(doc.getElementById('capture-error-overlay')!.style.display).toBe('flex')
    expect(doc.getElementById('capture-error-orderid')!.textContent).toBe('CARD-SERVER-ERR')
  })

  // ── 7. Card payment — error paths ─────────────────────────────────────────

  it('card declined (onError) → error message shown, button re-enabled', async () => {
    const { win, doc } = await createPage()
    win.__ppCard.onError(new win.Error('INSTRUMENT_DECLINED'))
    await tick()

    const err = doc.getElementById('card-error')!
    expect(err.style.display).toBe('block')
    expect(err.textContent).toContain('Payment failed')
    expect((doc.getElementById('card-pay-btn') as HTMLButtonElement).disabled).toBe(false)
  })

  it('card submit throws (network down) → error shown, button re-enabled', async () => {
    const { win, doc } = await createPage()
    win.__ppCardShouldFail = true

    fill(doc, 'buyer-email', 'x@x.com')
    click(doc, 'card-pay-btn')
    await tick()

    expect(doc.getElementById('card-error')!.style.display).toBe('block')
    expect((doc.getElementById('card-pay-btn') as HTMLButtonElement).disabled).toBe(false)
  })

  // ── 8. PayPal button flows ────────────────────────────────────────────────

  it('PayPal button: createOrder uses cachedOrderData — returns instantly, then background-prefetches next', async () => {
    const { win } = await createPage()

    // Cached order is ready from page-load prefetch
    expect(win.cachedOrderData?.orderID).toBe('PREFETCH-123')

    // createOrder() resolves synchronously from cache (no waiting on a fetch)
    const start = Date.now()
    const orderId = await win.__ppButtons.createOrder()
    const elapsed = Date.now() - start

    expect(orderId).toBe('PREFETCH-123')
    expect(elapsed).toBeLessThan(20)   // instant — no network round-trip
    expect(win.cachedOrderData).toBeNull()  // cache consumed

    // Background prefetch fires to reload the cache
    await tick()
    const prefetchCall = win.__fetchLog.find((e: any) =>
      e.url.includes('create-order') && win.__fetchLog.indexOf(e) > 0
    )
    expect(prefetchCall).toBeDefined()
  })

  it('PayPal button: createOrder fetches fresh when cache empty', async () => {
    const { win } = await createPage()
    win.cachedOrderData = null
    setQ(win, [{ json: { orderID: 'FRESH-ORDER', finalPrice: 14.99 } }])

    const orderId = await win.__ppButtons.createOrder()
    expect(orderId).toBe('FRESH-ORDER')
  })

  it('PayPal button: happy path → capture → recordPurchase → success overlay', async () => {
    const { win, doc } = await createPage()
    setQ(win, [{ json: { ok: true, newAccount: false } }])

    await win.__ppButtons.onApprove({ orderID: 'PP-OK' }, makeActions(win, 'pp@paypal.com'))
    await tick()

    expect(doc.getElementById('success-overlay')!.style.display).toBe('flex')
  })

  it('PayPal button: payer email from PayPal sent to capture API', async () => {
    const { win, doc: _doc } = await createPage()
    setQ(win, [{ json: { ok: true } }])

    await win.__ppButtons.onApprove({ orderID: 'PP-EMAIL' }, makeActions(win, 'verified@paypal.com'))
    await tick()

    const captureCall = win.__fetchLog.find((e: any) => e.url.includes('capture'))
    expect(captureCall?.body?.email).toBe('verified@paypal.com')
  })

  it('PayPal button: actions.order.capture() throws → captureError shown', async () => {
    const { win, doc } = await createPage()
    const failActions = {
      order: { capture: () => new win.Promise((_: unknown, reject: (e: unknown) => void) => reject(new win.Error('capture failed'))) }
    }
    await win.__ppButtons.onApprove({ orderID: 'PP-CATCH' }, failActions)
    await tick()

    expect(doc.getElementById('capture-error-overlay')!.style.display).toBe('flex')
    expect(doc.getElementById('capture-error-orderid')!.textContent).toBe('PP-CATCH')
  })

  it('PayPal button: onError → error message shown next to button', async () => {
    const { win, doc } = await createPage()
    win.__ppButtons.onError(new win.Error('SDK failure'))
    await tick()

    const errP = doc.querySelector('#paypal-btn-wrap + p') as HTMLElement
    expect(errP).toBeTruthy()
    expect(errP.textContent).toContain('Payment error')
  })

  it('PayPal button: onError message auto-removes after 6s', async () => {
    const { win, doc } = await createPage()
    vi.useFakeTimers()

    win.__ppButtons.onError(new win.Error('SDK failure'))
    expect(doc.querySelector('#paypal-btn-wrap + p')).toBeTruthy()

    vi.advanceTimersByTime(6100)
    expect(doc.querySelector('#paypal-btn-wrap + p')).toBeNull()

    vi.useRealTimers()
  })

  // ── 9. Cached order lifecycle ─────────────────────────────────────────────

  it('consuming cache triggers a new prefetch immediately', async () => {
    const { win } = await createPage()
    setQ(win, [{ json: { orderID: 'NEXT-PREFETCH', finalPrice: 14.99 } }])

    await win.__ppButtons.createOrder()  // consumes PREFETCH-123
    await tick()

    expect(win.cachedOrderData?.orderID).toBe('NEXT-PREFETCH')
  })

  it('promo applied → cache is null then refilled with promo code', async () => {
    const { win, doc } = await createPage()
    setQ(win, [
      { json: { valid: true, code: 'HALF50', discount: 50, finalPrice: 7.50 } },
      { json: { orderID: 'PROMO-HALF', finalPrice: 7.50 } },
    ])

    fill(doc, 'promo-input', 'HALF50')
    doc.querySelector<HTMLButtonElement>('.promo-apply-btn')!.click()
    await tick()

    // Cache should be refilled with promo-aware order
    expect(win.cachedOrderData?.orderID).toBe('PROMO-HALF')
  })

  // ── 10. CardFields not eligible ───────────────────────────────────────────

  it('CardFields not eligible → card section stays hidden, note added', async () => {
    const { doc } = await createPage({ cardEligible: false })
    expect(doc.getElementById('card-section')!.style.display).toBe('none')

    const note = doc.querySelector('#paypal-btn-wrap + p') as HTMLElement
    expect(note).toBeTruthy()
    expect(note.textContent).toContain('Debit or Credit Card')
  })

  // ── 11. Email wired through to server ─────────────────────────────────────

  it('card: email entered by user is sent to capture API', async () => {
    const { win, doc } = await createPage()
    setQ(win, [{ json: { ok: true } }])

    fill(doc, 'buyer-email', 'cardbuyer@test.com')
    click(doc, 'card-pay-btn')
    await win.__ppCard.onApprove({ orderID: 'CARD-EMAIL' })
    await tick()

    const captureCall = win.__fetchLog.find((e: any) => e.url.includes('capture'))
    expect(captureCall?.body?.email).toBe('cardbuyer@test.com')
  })

  // ── 12. Existing account login button ─────────────────────────────────────

  it('existing account success → success overlay has login link', async () => {
    const { win, doc } = await createPage()
    setQ(win, [{ json: { ok: true, newAccount: false } }])

    await win.__ppButtons.onApprove({ orderID: 'PP-EXIST2' }, makeActions(win))
    await tick()

    const link = doc.querySelector('#success-msg-normal a') as HTMLAnchorElement
    expect(link?.href).toContain('/login')
  })

  // ── 13. Server down during capture ───────────────────────────────────────

  it('capture API unreachable (network error) → captureError overlay', async () => {
    const { win, doc } = await createPage()
    win.fetch = function() { return win.Promise.reject(new win.Error('network')); }

    await win.__ppButtons.onApprove({ orderID: 'PP-NET-DOWN' }, makeActions(win))
    await tick()

    expect(doc.getElementById('capture-error-overlay')!.style.display).toBe('flex')
  })
})
